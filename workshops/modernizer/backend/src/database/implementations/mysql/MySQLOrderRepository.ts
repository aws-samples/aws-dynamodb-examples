import { OrderRepository } from '../../../repositories/OrderRepository';
import { IOrderRepository } from '../../interfaces/IOrderRepository';
import { Order, OrderWithItems, OrderItem } from '../../../models/Order';

export class MySQLOrderRepository implements IOrderRepository {
  private orderRepository: OrderRepository;

  constructor() {
    this.orderRepository = new OrderRepository();
  }

  async createOrder(userId: number, totalAmount: number, mysqlResult?: Order): Promise<Order> {
    return this.orderRepository.createOrder(userId, totalAmount);
  }

  async createOrderItem(orderId: number, productId: number, quantity: number, priceAtTime: number): Promise<OrderItem> {
    return this.orderRepository.createOrderItem(orderId, productId, quantity, priceAtTime);
  }

  async getOrderById(orderId: number): Promise<OrderWithItems | null> {
    return this.orderRepository.getOrderById(orderId);
  }

  async getUserOrders(userId: number, limit: number = 20, offset: number = 0): Promise<OrderWithItems[]> {
    return this.orderRepository.getUserOrders(userId, limit, offset);
  }

  async updateOrderStatus(orderId: number, status: 'pending' | 'completed' | 'cancelled'): Promise<boolean> {
    return this.orderRepository.updateOrderStatus(orderId, status);
  }

  async getUserOrderCount(userId: number): Promise<number> {
    return this.orderRepository.getUserOrderCount(userId);
  }

  async getOrdersByStatus(status: 'pending' | 'completed' | 'cancelled', limit: number = 50): Promise<OrderWithItems[]> {
    return this.orderRepository.getOrdersByStatus(status, limit);
  }
}
