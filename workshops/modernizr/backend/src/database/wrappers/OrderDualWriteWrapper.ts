import { DualWriteWrapper, DualWriteOperation, DualWriteResult } from './DualWriteWrapper';
import { IOrderRepository } from '../interfaces/IOrderRepository';
import { IUserRepository } from '../interfaces/IUserRepository';
import { Order, OrderWithItems, OrderItem } from '../../models/Order';
import { FeatureFlagService } from '../../services/FeatureFlagService';

export class OrderDualWriteWrapper extends DualWriteWrapper<Order> implements IOrderRepository {
  protected entityType = 'Order';
  private mysqlOrderRepo: IOrderRepository;
  private dynamodbOrderRepo: IOrderRepository;
  private mysqlUserRepo: IUserRepository;

  constructor(
    mysqlOrderRepo: IOrderRepository,
    dynamodbOrderRepo: IOrderRepository,
    mysqlUserRepo: IUserRepository
  ) {
    super();
    this.mysqlOrderRepo = mysqlOrderRepo;
    this.dynamodbOrderRepo = dynamodbOrderRepo;
    this.mysqlUserRepo = mysqlUserRepo;
  }

  async createOrder(userId: number, totalAmount: number): Promise<Order> {
    const result = await this.executeDualWriteCreate(userId, totalAmount);
    if (!result.success || !result.data) {
      throw new Error(result.error?.message || 'Failed to create order');
    }
    return result.data;
  }

  async createOrderItem(orderId: number, productId: number, quantity: number, priceAtTime: number): Promise<OrderItem> {
    try {
      const mysqlResult = await this.mysqlOrderRepo.createOrderItem(orderId, productId, quantity, priceAtTime);
      if (mysqlResult && FeatureFlagService.getFlag('dual_write_enabled')) {
        await this.dynamodbOrderRepo.createOrderItem(orderId, productId, quantity, priceAtTime);
      }
      return mysqlResult;
    } catch (error) {
      console.error(`Failed to create order item for order ${orderId}:`, error);
      throw error;
    }
  }

  async updateOrderStatus(orderId: number, status: 'pending' | 'completed' | 'cancelled'): Promise<boolean> {
    try {
      const mysqlResult = await this.mysqlOrderRepo.updateOrderStatus(orderId, status);
      if (mysqlResult && FeatureFlagService.getFlag('dual_write_enabled')) {
        await this.dynamodbOrderRepo.updateOrderStatus(orderId, status);
      }
      return mysqlResult;
    } catch (error) {
      console.error(`Failed to update order status ${orderId}:`, error);
      return false;
    }
  }

  private async executeDualWriteCreate(userId: number, totalAmount: number): Promise<DualWriteResult<Order>> {
    const operation: DualWriteOperation<Order> = {
      mysqlOperation: () => this.mysqlOrderRepo.createOrder(userId, totalAmount),
      dynamodbOperation: async (mysqlResult) => {
        const dynamoData = await this.transformForDynamoDB(mysqlResult);
        // Pass MySQL result to DynamoDB for ID consistency
        return this.dynamodbOrderRepo.createOrder(userId, totalAmount, mysqlResult);
      },
      dynamodbOnlyOperation: async () => {
        console.log(`📦 Phase 5: DynamoDB-only createOrder called: userId=${userId}, totalAmount=${totalAmount}`);
        return this.dynamodbOrderRepo.createOrder(userId, totalAmount);
      }
    };

    return this.executeDualWrite(operation, 'CREATE');
  }

  protected extractEntityId(data: Order | any): string | number {
    return data && typeof data === 'object' && 'id' in data ? data.id : 'N/A';
  }

  async transformForDynamoDB(mysqlData: Order): Promise<any> {
    // Get user email for DynamoDB PK
    const user = await this.mysqlUserRepo.findById(mysqlData.user_id);
    if (!user) {
      throw new Error(`User not found: ${mysqlData.user_id}`);
    }

    // Get order items for denormalization
    // Get order items would require additional repository method
    const orderItems: any[] = [];

    return {
      ...mysqlData,
      id: this.transformId(mysqlData.id),
      userId: this.transformId(mysqlData.user_id),
      // Denormalized fields for DynamoDB
      userEmail: user.email,
      orderItems: orderItems || [] // Store as JSON array in DynamoDB
    };
  }

  createRollbackOperation(mysqlData: Order): (() => Promise<void>) | undefined {
    return () => Promise.resolve();
  }

  // Read operations - delegate to primary repository (MySQL)
  async getOrderById(orderId: number): Promise<OrderWithItems | null> {
    return this.mysqlOrderRepo.getOrderById(orderId);
  }

  async getUserOrders(userId: number, limit?: number, offset?: number): Promise<OrderWithItems[]> {
    return this.mysqlOrderRepo.getUserOrders(userId, limit, offset);
  }

  async getUserOrderCount(userId: number): Promise<number> {
    return this.mysqlOrderRepo.getUserOrderCount(userId);
  }

  async getOrdersByStatus(status: 'pending' | 'completed' | 'cancelled', limit?: number): Promise<OrderWithItems[]> {
    return this.mysqlOrderRepo.getOrdersByStatus(status, limit);
  }
}
