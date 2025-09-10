import { BaseDynamoDBRepository } from './BaseDynamoDBRepository';
import { IOrderRepository } from '../../interfaces/IOrderRepository';
import { IUserRepository } from '../../interfaces/IUserRepository';
import { Order, OrderWithItems, OrderItem, OrderItemWithProduct } from '../../../models/Order';

export class DynamoDBOrderRepository extends BaseDynamoDBRepository implements IOrderRepository {
  private userRepository: IUserRepository;

  constructor(tableName: string, userRepository: IUserRepository) {
    super(tableName);
    this.userRepository = userRepository;
  }

  async createOrder(userId: number, totalAmount: number, mysqlResult?: Order): Promise<Order> {
    // Use MySQL result if provided (dual-write), otherwise generate new ID
    const id = mysqlResult ? mysqlResult.id : Date.now();
    const now = mysqlResult ? mysqlResult.created_at : new Date();
    
    // Try DynamoDB first, fallback to MySQL during transition period
    let user = await this.userRepository.findById(userId);
    if (!user) {
      // During transition, user might only exist in MySQL
      const MySQLUserRepository = require('../mysql/MySQLUserRepository').MySQLUserRepository;
      const mysqlUserRepo = new MySQLUserRepository();
      user = await mysqlUserRepo.findById(userId);
      if (!user) {
        throw new Error(`User with ID ${userId} not found`);
      }
    }

    const order: Order = {
      id,
      user_id: userId,
      total_amount: totalAmount,
      status: mysqlResult ? mysqlResult.status : 'pending',
      created_at: now,
      updated_at: mysqlResult ? mysqlResult.updated_at : now
    };

    // Migration contract: PK = user_email, SK = ORDER#{created_at}#{order_id}
    const item = {
      PK: user.email,
      SK: `ORDER#${now.toISOString()}#${id}`,
      GSI3PK: `ORDER#${id}`, // For order lookup by ID
      GSI3SK: `ORDER#${id}`,
      user_id: userId.toString(),
      order_id: id.toString(), // Use the actual ID (MySQL or generated)
      order_status: order.status,
      total_amount: totalAmount,
      order_items: '[]', // Denormalized order items as JSON
      shipping_address: '',
      payment_method: '',
      created_at: now.toISOString(),
      updated_at: now.toISOString()
    };

    console.log(`📦 DynamoDB createOrder: PK=${item.PK}, SK=${item.SK}, ID=${id}`);
    console.log(`📦 DynamoDB createOrder item:`, JSON.stringify(item, null, 2));
    await this.putItem(item);
    console.log(`📦 DynamoDB createOrder completed successfully`);
    return order;
  }

  async createOrderItem(orderId: number, productId: number, quantity: number, priceAtTime: number): Promise<OrderItem> {
    // Small delay to handle GSI eventual consistency
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Find the order and update its denormalized order_items JSON
    const order = await this.findById(orderId);
    if (!order) {
      throw new Error(`Order with ID ${orderId} not found`);
    }

    let user = await this.userRepository.findById(order.user_id);
    if (!user) {
      // During transition, user might only exist in MySQL
      const MySQLUserRepository = require('../mysql/MySQLUserRepository').MySQLUserRepository;
      const mysqlUserRepo = new MySQLUserRepository();
      user = await mysqlUserRepo.findById(order.user_id);
      if (!user) {
        throw new Error(`User with ID ${order.user_id} not found`);
      }
    }

    // Get product details to store in order_items
    const { DatabaseFactory } = require('../../factory/DatabaseFactory');
    const productRepo = DatabaseFactory.createProductRepository();
    const product = await productRepo.getProductById(productId);
    if (!product) {
      throw new Error(`Product with ID ${productId} not found`);
    }

    // Get current order record to update order_items
    const result = await this.query(
      'PK = :pk AND SK = :sk',
      {
        ':pk': user.email,
        ':sk': `ORDER#${order.created_at.toISOString()}#${orderId}`
      }
    );
    if (!result || !Array.isArray(result) || result.length === 0) {
      throw new Error(`Order record not found for ID ${orderId}`);
    }

    const orderRecord = result[0];
    const existingItems = JSON.parse(orderRecord.order_items || '[]');
    
    const newItem = {
      product_id: productId,
      quantity: quantity,
      price_at_time: priceAtTime,
      product_name: product.name,
      product_description: product.description,
      product_image_url: product.image_url
    };
    
    existingItems.push(newItem);

    // Update the order record with new order_items using updateItem to preserve existing attributes
    await this.updateItem(
      { PK: user.email, SK: `ORDER#${order.created_at.toISOString()}#${orderId}` },
      'SET order_items = :items, updated_at = :updated',
      {
        ':items': JSON.stringify(existingItems),
        ':updated': new Date().toISOString()
      }
    );
    
    return {
      id: Date.now(),
      order_id: orderId,
      product_id: productId,
      quantity,
      price_at_time: priceAtTime
    };
  }

  async findById(id: number): Promise<Order | null> {
    console.log(`🔍 DynamoDB findById called for order ID: ${id}`);
    
    // Retry logic for eventual consistency
    for (let attempt = 1; attempt <= 3; attempt++) {
      const result = await this.query(
        'GSI3PK = :pk',
        { ':pk': `ORDER#${id}` },
        'GSI3'
      );

      console.log(`🔍 DynamoDB findById query result (attempt ${attempt}):`, result);

      if (result && Array.isArray(result) && result.length > 0) {
        const item = result[0];
        console.log(`🔍 Found order item:`, item);
        
        return {
          id: parseInt(item.order_id),
          user_id: parseInt(item.user_id),
          total_amount: parseFloat(item.total_amount),
          status: item.order_status,
          created_at: new Date(item.created_at),
          updated_at: new Date(item.updated_at)
        };
      }

      if (attempt < 3) {
        console.log(`🔍 Order not found on attempt ${attempt}, retrying in 200ms...`);
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    console.log(`🔍 No order found with ID ${id} after 3 attempts`);
    return null;
  }

  async findByUserId(userId: number): Promise<Order[]> {
    console.log(`🔍 DynamoDB findByUserId called for userId: ${userId}`);
    
    // Get user email first
    const user = await this.userRepository.findById(userId);
    if (!user) {
      console.log(`🔍 User not found for userId: ${userId}`);
      return [];
    }

    console.log(`🔍 Found user email: ${user.email}`);

    // Get full order data directly using getItem for each order
    // First, query to get the order keys
    const keyResult = await this.query(
      'PK = :pk AND begins_with(SK, :sk)',
      {
        ':pk': user.email,
        ':sk': 'ORDER#'
      }
    );

    if (!keyResult || !Array.isArray(keyResult)) {
      return [];
    }

    // Get full order data using getItem for each order
    const orders: Order[] = [];
    for (const keyItem of keyResult) {
      const fullItem = await this.getItem({
        PK: keyItem.PK,
        SK: keyItem.SK
      });

      if (fullItem) {
        console.log(`🔍 Retrieved full order data:`, fullItem);
        const skParts = fullItem.SK.split('#');
        const orderId = skParts.length >= 3 ? parseInt(skParts[2]) : parseInt(fullItem.order_id);
        
        orders.push({
          id: orderId,
          user_id: parseInt(fullItem.user_id),
          total_amount: parseFloat(fullItem.total_amount),
          status: fullItem.order_status,
          created_at: new Date(fullItem.created_at),
          updated_at: new Date(fullItem.updated_at)
        });
      }
    }

    return orders;
  }

  async updateStatus(id: number, status: string): Promise<boolean> {
    const order = await this.findById(id);
    if (!order) {
      return false;
    }

    const user = await this.userRepository.findById(order.user_id);
    if (!user) {
      return false;
    }

    // Use updateItem instead of putItem to preserve other fields
    await this.updateItem(
      {
        PK: user.email,
        SK: `ORDER#${order.created_at.toISOString()}#${id}`
      },
      'SET order_status = :status, updated_at = :updated_at',
      {
        ':status': status,
        ':updated_at': new Date().toISOString()
      }
    );

    return true;
  }

  async updateShippingAddress(id: number, shippingAddress: string): Promise<boolean> {
    const order = await this.findById(id);
    if (!order) {
      return false;
    }

    const user = await this.userRepository.findById(order.user_id);
    if (!user) {
      return false;
    }

    const updateParams = {
      PK: user.email,
      SK: `ORDER#${order.created_at.toISOString()}#${id}`,
      shipping_address: shippingAddress,
      updated_at: new Date().toISOString()
    };

    await this.putItem(updateParams);
    return true;
  }

  async updatePaymentMethod(id: number, paymentMethod: string): Promise<boolean> {
    const order = await this.findById(id);
    if (!order) {
      return false;
    }

    const user = await this.userRepository.findById(order.user_id);
    if (!user) {
      return false;
    }

    const updateParams = {
      PK: user.email,
      SK: `ORDER#${order.created_at.toISOString()}#${id}`,
      payment_method: paymentMethod,
      updated_at: new Date().toISOString()
    };

    await this.putItem(updateParams);
    return true;
  }

  // Required interface methods
  async getOrderById(orderId: number): Promise<OrderWithItems | null> {
    return this.findByIdWithItems(orderId);
  }

  async getUserOrders(userId: number, limit: number = 10, offset: number = 0): Promise<OrderWithItems[]> {
    return this.findByUserIdWithItems(userId);
  }

  async updateOrderStatus(orderId: number, status: 'pending' | 'completed' | 'cancelled'): Promise<boolean> {
    return this.updateStatus(orderId, status);
  }

  async getUserOrderCount(userId: number): Promise<number> {
    const orders = await this.findByUserId(userId);
    return orders.length;
  }

  async getOrdersByStatus(status: 'pending' | 'completed' | 'cancelled', limit: number = 10): Promise<OrderWithItems[]> {
    // Simplified implementation - would need GSI on order_status for efficiency
    const allOrders = await this.findByUserIdWithItems(0);
    return allOrders.filter(order => order.status === status).slice(0, limit);
  }

  // Helper methods
  async findByIdWithItems(id: number): Promise<OrderWithItems | null> {
    const order = await this.findById(id);
    if (!order) {
      return null;
    }

    const orderItems = await this.findOrderItemsByOrderId(id);
    return {
      ...order,
      items: orderItems
    };
  }

  async findByUserIdWithItems(userId: number): Promise<OrderWithItems[]> {
    const orders = await this.findByUserId(userId);
    const ordersWithItems: OrderWithItems[] = [];

    for (const order of orders) {
      const orderItems = await this.findOrderItemsByOrderId(order.id);
      ordersWithItems.push({
        ...order,
        items: orderItems
      });
    }

    return ordersWithItems;
  }

  async findOrderItemsByOrderId(orderId: number): Promise<OrderItemWithProduct[]> {
    const order = await this.findById(orderId);
    if (!order) {
      return [];
    }

    // Get the full order record to access order_items JSON
    const user = await this.userRepository.findById(order.user_id);
    if (!user) {
      return [];
    }

    const result = await this.query(
      'PK = :pk AND SK = :sk',
      {
        ':pk': user.email,
        ':sk': `ORDER#${order.created_at.toISOString()}#${orderId}`
      }
    );
    if (!result || !Array.isArray(result) || result.length === 0) {
      return [];
    }

    const orderRecord = result[0];
    const orderItems = JSON.parse(orderRecord.order_items || '[]');
    
    // Convert to OrderItemWithProduct[] using stored product details
    return orderItems.map((item: any, index: number) => ({
      id: index + 1,
      order_id: orderId,
      product_id: item.product_id,
      quantity: item.quantity,
      price_at_time: item.price_at_time,
      product: {
        id: item.product_id,
        seller_id: 0, // Placeholder
        category_id: 0, // Placeholder
        name: item.product_name || `Product ${item.product_id}`,
        description: item.product_description || '',
        price: item.price_at_time,
        inventory_quantity: 0, // Placeholder
        image_url: item.product_image_url || '',
        created_at: new Date(),
        updated_at: new Date(),
        category_name: '', // Placeholder
        seller_username: '', // Placeholder
        seller_email: '' // Placeholder
      }
    }));
  }
}
