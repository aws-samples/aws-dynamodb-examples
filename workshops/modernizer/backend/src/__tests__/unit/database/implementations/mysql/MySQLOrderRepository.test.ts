import { MySQLOrderRepository } from '../../../../../database/implementations/mysql/MySQLOrderRepository';
import { OrderRepository } from '../../../../../repositories/OrderRepository';
import { Order, OrderWithItems } from '../../../../../models/Order';

jest.mock('../../../../../repositories/OrderRepository');

describe('MySQLOrderRepository', () => {
  let mysqlOrderRepository: MySQLOrderRepository;
  let mockOrderRepository: jest.Mocked<OrderRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockOrderRepository = new OrderRepository() as jest.Mocked<OrderRepository>;
    mysqlOrderRepository = new MySQLOrderRepository();
    (mysqlOrderRepository as any).orderRepository = mockOrderRepository;
  });

  describe('createOrder', () => {
    it('should delegate to OrderRepository.createOrder', async () => {
      const userId = 1;
      const totalAmount = 99.99;
      const mockOrder: Order = {
        id: 1,
        user_id: userId,
        total_amount: totalAmount,
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date()
      };

      mockOrderRepository.createOrder.mockResolvedValueOnce(mockOrder);

      const result = await mysqlOrderRepository.createOrder(userId, totalAmount);

      expect(result).toEqual(mockOrder);
      expect(mockOrderRepository.createOrder).toHaveBeenCalledWith(userId, totalAmount);
    });
  });

  describe('getOrderById', () => {
    it('should delegate to OrderRepository.getOrderById', async () => {
      const orderId = 1;
      const mockOrderWithItems: OrderWithItems = {
        id: orderId,
        user_id: 1,
        total_amount: 99.99,
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date(),
        items: []
      };

      mockOrderRepository.getOrderById.mockResolvedValueOnce(mockOrderWithItems);

      const result = await mysqlOrderRepository.getOrderById(orderId);

      expect(result).toEqual(mockOrderWithItems);
      expect(mockOrderRepository.getOrderById).toHaveBeenCalledWith(orderId);
    });
  });

  describe('getUserOrders', () => {
    it('should delegate to OrderRepository.getUserOrders', async () => {
      const userId = 1;
      const limit = 20;
      const offset = 0;
      const mockOrders: OrderWithItems[] = [];

      mockOrderRepository.getUserOrders.mockResolvedValueOnce(mockOrders);

      const result = await mysqlOrderRepository.getUserOrders(userId, limit, offset);

      expect(result).toEqual(mockOrders);
      expect(mockOrderRepository.getUserOrders).toHaveBeenCalledWith(userId, limit, offset);
    });
  });

  describe('updateOrderStatus', () => {
    it('should delegate to OrderRepository.updateOrderStatus', async () => {
      const orderId = 1;
      const status = 'completed' as const;

      mockOrderRepository.updateOrderStatus.mockResolvedValueOnce(true);

      const result = await mysqlOrderRepository.updateOrderStatus(orderId, status);

      expect(result).toBe(true);
      expect(mockOrderRepository.updateOrderStatus).toHaveBeenCalledWith(orderId, status);
    });
  });

  describe('getOrdersByStatus', () => {
    it('should delegate to OrderRepository.getOrdersByStatus', async () => {
      const status = 'pending' as const;
      const limit = 50;
      const mockOrders: OrderWithItems[] = [];

      mockOrderRepository.getOrdersByStatus.mockResolvedValueOnce(mockOrders);

      const result = await mysqlOrderRepository.getOrdersByStatus(status, limit);

      expect(result).toEqual(mockOrders);
      expect(mockOrderRepository.getOrdersByStatus).toHaveBeenCalledWith(status, limit);
    });
  });
});
