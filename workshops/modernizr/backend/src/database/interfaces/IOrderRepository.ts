import { Order, OrderWithItems, OrderItem } from '../../models/Order';

/**
 * Abstract interface for Order repository operations
 * Supports both MySQL and DynamoDB implementations
 */
export interface IOrderRepository {
  /**
   * Create a new order
   * @param userId User ID
   * @param totalAmount Total order amount
   * @param mysqlResult Optional MySQL result for dual-write consistency
   * @returns Promise resolving to created Order
   */
  createOrder(userId: number, totalAmount: number, mysqlResult?: Order): Promise<Order>;

  /**
   * Create an order item
   * @param orderId Order ID
   * @param productId Product ID
   * @param quantity Quantity
   * @param priceAtTime Price at time of order
   * @returns Promise resolving to created OrderItem
   */
  createOrderItem(orderId: number, productId: number, quantity: number, priceAtTime: number): Promise<OrderItem>;

  /**
   * Get order by ID with items
   * @param orderId Order ID
   * @returns Promise resolving to OrderWithItems or null if not found
   */
  getOrderById(orderId: number): Promise<OrderWithItems | null>;

  /**
   * Get user orders with pagination
   * @param userId User ID
   * @param limit Maximum number of orders to return
   * @param offset Number of orders to skip
   * @returns Promise resolving to array of OrderWithItems
   */
  getUserOrders(userId: number, limit?: number, offset?: number): Promise<OrderWithItems[]>;

  /**
   * Update order status
   * @param orderId Order ID
   * @param status New order status
   * @returns Promise resolving to boolean indicating success
   */
  updateOrderStatus(orderId: number, status: 'pending' | 'completed' | 'cancelled'): Promise<boolean>;

  /**
   * Get count of user orders
   * @param userId User ID
   * @returns Promise resolving to order count
   */
  getUserOrderCount(userId: number): Promise<number>;

  /**
   * Get orders by status
   * @param status Order status
   * @param limit Maximum number of orders to return
   * @returns Promise resolving to array of OrderWithItems
   */
  getOrdersByStatus(status: 'pending' | 'completed' | 'cancelled', limit?: number): Promise<OrderWithItems[]>;
}
