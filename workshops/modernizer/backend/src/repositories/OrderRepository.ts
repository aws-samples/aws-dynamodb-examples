import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { pool } from '../config/database';
import { Order, OrderItem, OrderWithItems, OrderItemWithProduct } from '../models/Order';

export class OrderRepository {
  async createOrder(userId: number, totalAmount: number): Promise<Order> {
    const connection = await pool.getConnection();
    
    try {
      const [result] = await connection.execute<ResultSetHeader>(
        'INSERT INTO orders (user_id, total_amount, status) VALUES (?, ?, ?)',
        [userId, totalAmount, 'pending']
      );

      if (result.affectedRows === 0) {
        throw new Error('Failed to create order');
      }

      const orderId = result.insertId;
      
      // Fetch and return the created order
      const [orderRows] = await connection.execute<RowDataPacket[]>(
        'SELECT * FROM orders WHERE id = ?',
        [orderId]
      );

      if (orderRows.length === 0) {
        throw new Error('Failed to retrieve created order');
      }

      const orderRow = orderRows[0];
      return {
        id: orderRow.id,
        user_id: orderRow.user_id,
        total_amount: parseFloat(orderRow.total_amount),
        status: orderRow.status,
        created_at: orderRow.created_at,
        updated_at: orderRow.updated_at
      };
    } finally {
      connection.release();
    }
  }

  async createOrderItem(orderId: number, productId: number, quantity: number, priceAtTime: number): Promise<OrderItem> {
    const connection = await pool.getConnection();
    
    try {
      const [result] = await connection.execute<ResultSetHeader>(
        'INSERT INTO order_items (order_id, product_id, quantity, price_at_time) VALUES (?, ?, ?, ?)',
        [orderId, productId, quantity, priceAtTime]
      );

      if (result.affectedRows === 0) {
        throw new Error('Failed to create order item');
      }

      return {
        id: result.insertId,
        order_id: orderId,
        product_id: productId,
        quantity,
        price_at_time: priceAtTime
      };
    } finally {
      connection.release();
    }
  }

  async getOrderById(orderId: number): Promise<OrderWithItems | null> {
    const connection = await pool.getConnection();
    
    try {
      // Get order details
      const [orderRows] = await connection.execute<RowDataPacket[]>(
        'SELECT * FROM orders WHERE id = ?',
        [orderId]
      );

      if (orderRows.length === 0) {
        return null;
      }

      const orderRow = orderRows[0];
      
      // Get order items with product details
      const [itemRows] = await connection.execute<RowDataPacket[]>(
        `SELECT 
          oi.id,
          oi.order_id,
          oi.product_id,
          oi.quantity,
          oi.price_at_time,
          p.id as product_id,
          p.seller_id,
          p.category_id,
          p.name as product_name,
          p.description as product_description,
          p.price as current_price,
          p.inventory_quantity as product_inventory,
          p.image_url as product_image_url,
          p.created_at as product_created_at,
          p.updated_at as product_updated_at,
          c.name as category_name,
          u.username as seller_username,
          u.email as seller_email
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        JOIN categories c ON p.category_id = c.id
        JOIN users u ON p.seller_id = u.id
        WHERE oi.order_id = ?
        ORDER BY oi.id`,
        [orderId]
      );

      const items: OrderItemWithProduct[] = itemRows.map(row => ({
        id: row.id,
        order_id: row.order_id,
        product_id: row.product_id,
        quantity: row.quantity,
        price_at_time: parseFloat(row.price_at_time),
        product: {
          id: row.product_id,
          seller_id: row.seller_id,
          category_id: row.category_id,
          name: row.product_name,
          description: row.product_description,
          price: parseFloat(row.current_price),
          inventory_quantity: row.product_inventory,
          image_url: row.product_image_url,
          category_name: row.category_name,
          seller_username: row.seller_username,
          seller_email: row.seller_email,
          created_at: row.product_created_at,
          updated_at: row.product_updated_at
        }
      }));

      return {
        id: orderRow.id,
        user_id: orderRow.user_id,
        total_amount: parseFloat(orderRow.total_amount),
        status: orderRow.status,
        created_at: orderRow.created_at,
        updated_at: orderRow.updated_at,
        items
      };
    } finally {
      connection.release();
    }
  }

  async getUserOrders(userId: number, limit: number = 20, offset: number = 0): Promise<OrderWithItems[]> {
    const connection = await pool.getConnection();
    
    try {
      // Get user's orders
      const [orderRows] = await connection.execute<RowDataPacket[]>(
        `SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
        [userId]
      );

      if (orderRows.length === 0) {
        return [];
      }

      const orders: OrderWithItems[] = [];

      for (const orderRow of orderRows) {
        // Get order items for each order
        const [itemRows] = await connection.execute<RowDataPacket[]>(
          `SELECT 
            oi.id,
            oi.order_id,
            oi.product_id,
            oi.quantity,
            oi.price_at_time,
            p.id as product_id,
            p.seller_id,
            p.category_id,
            p.name as product_name,
            p.description as product_description,
            p.price as current_price,
            p.inventory_quantity as product_inventory,
            p.image_url as product_image_url,
            p.created_at as product_created_at,
            p.updated_at as product_updated_at,
            c.name as category_name,
            u.username as seller_username,
            u.email as seller_email
          FROM order_items oi
          JOIN products p ON oi.product_id = p.id
          JOIN categories c ON p.category_id = c.id
          JOIN users u ON p.seller_id = u.id
          WHERE oi.order_id = ?
          ORDER BY oi.id`,
          [orderRow.id]
        );

        const items: OrderItemWithProduct[] = itemRows.map(row => ({
          id: row.id,
          order_id: row.order_id,
          product_id: row.product_id,
          quantity: row.quantity,
          price_at_time: parseFloat(row.price_at_time),
          product: {
            id: row.product_id,
            seller_id: row.seller_id,
            category_id: row.category_id,
            name: row.product_name,
            description: row.product_description,
            price: parseFloat(row.current_price),
            inventory_quantity: row.product_inventory,
            image_url: row.product_image_url,
            category_name: row.category_name,
            seller_username: row.seller_username,
            seller_email: row.seller_email,
            created_at: row.product_created_at,
            updated_at: row.product_updated_at
          }
        }));

        orders.push({
          id: orderRow.id,
          user_id: orderRow.user_id,
          total_amount: parseFloat(orderRow.total_amount),
          status: orderRow.status,
          created_at: orderRow.created_at,
          updated_at: orderRow.updated_at,
          items
        });
      }

      return orders;
    } finally {
      connection.release();
    }
  }

  async updateOrderStatus(orderId: number, status: 'pending' | 'completed' | 'cancelled'): Promise<boolean> {
    const connection = await pool.getConnection();
    
    try {
      const [result] = await connection.execute<ResultSetHeader>(
        'UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [status, orderId]
      );

      return result.affectedRows > 0;
    } finally {
      connection.release();
    }
  }

  async getUserOrderCount(userId: number): Promise<number> {
    const connection = await pool.getConnection();
    
    try {
      const [rows] = await connection.execute<RowDataPacket[]>(
        'SELECT COUNT(*) as count FROM orders WHERE user_id = ?',
        [userId]
      );

      return rows[0].count;
    } finally {
      connection.release();
    }
  }

  async getOrdersByStatus(status: 'pending' | 'completed' | 'cancelled', limit: number = 50): Promise<OrderWithItems[]> {
    const connection = await pool.getConnection();
    
    try {
      const [orderRows] = await connection.execute<RowDataPacket[]>(
        `SELECT * FROM orders WHERE status = ? ORDER BY created_at DESC LIMIT ${limit}`,
        [status]
      );

      if (orderRows.length === 0) {
        return [];
      }

      const orders: OrderWithItems[] = [];

      for (const orderRow of orderRows) {
        const [itemRows] = await connection.execute<RowDataPacket[]>(
          `SELECT 
            oi.id,
            oi.order_id,
            oi.product_id,
            oi.quantity,
            oi.price_at_time,
            p.id as product_id,
            p.seller_id,
            p.category_id,
            p.name as product_name,
            p.description as product_description,
            p.price as current_price,
            p.inventory_quantity as product_inventory,
            p.image_url as product_image_url,
            p.created_at as product_created_at,
            p.updated_at as product_updated_at,
            c.name as category_name,
            u.username as seller_username,
            u.email as seller_email
          FROM order_items oi
          JOIN products p ON oi.product_id = p.id
          JOIN categories c ON p.category_id = c.id
          JOIN users u ON p.seller_id = u.id
          WHERE oi.order_id = ?
          ORDER BY oi.id`,
          [orderRow.id]
        );

        const items: OrderItemWithProduct[] = itemRows.map(row => ({
          id: row.id,
          order_id: row.order_id,
          product_id: row.product_id,
          quantity: row.quantity,
          price_at_time: parseFloat(row.price_at_time),
          product: {
            id: row.product_id,
            seller_id: row.seller_id,
            category_id: row.category_id,
            name: row.product_name,
            description: row.product_description,
            price: parseFloat(row.current_price),
            inventory_quantity: row.product_inventory,
            image_url: row.product_image_url,
            category_name: row.category_name,
            seller_username: row.seller_username,
            seller_email: row.seller_email,
            created_at: row.product_created_at,
            updated_at: row.product_updated_at
          }
        }));

        orders.push({
          id: orderRow.id,
          user_id: orderRow.user_id,
          total_amount: parseFloat(orderRow.total_amount),
          status: orderRow.status,
          created_at: orderRow.created_at,
          updated_at: orderRow.updated_at,
          items
        });
      }

      return orders;
    } finally {
      connection.release();
    }
  }
}