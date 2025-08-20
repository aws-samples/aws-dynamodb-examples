import { OrderDualWriteWrapper } from '../../../../database/wrappers/OrderDualWriteWrapper';
import { IOrderRepository } from '../../../../database/interfaces/IOrderRepository';
import { IUserRepository } from '../../../../database/interfaces/IUserRepository';
import { FeatureFlagService } from '../../../../services/FeatureFlagService';
import { Order, OrderItem } from '../../../../models/Order';
import { User } from '../../../../models/User';

describe('OrderDualWriteWrapper', () => {
  let wrapper: OrderDualWriteWrapper;
  let mysqlOrderRepo: jest.Mocked<IOrderRepository>;
  let dynamodbOrderRepo: jest.Mocked<IOrderRepository>;
  let mysqlUserRepo: jest.Mocked<IUserRepository>;
  let featureFlagService: FeatureFlagService;

  const mockOrder: Order = {
    id: 1,
    user_id: 1,
    total_amount: 99.99,
    status: 'pending',
    created_at: new Date(),
    updated_at: new Date()
  };

  const mockUser: User = {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    password_hash: 'hashedpassword',
    first_name: 'Test',
    last_name: 'User',
    is_seller: false,
    super_admin: false,
    created_at: new Date(),
    updated_at: new Date()
  };

  const mockOrderItem: OrderItem = {
    id: 1,
    order_id: 1,
    product_id: 1,
    quantity: 2,
    price_at_time: 49.99
  };

  beforeEach(() => {
    mysqlOrderRepo = {
      createOrder: jest.fn(),
      createOrderItem: jest.fn(),
      getOrderById: jest.fn(),
      getUserOrders: jest.fn(),
      updateOrderStatus: jest.fn(),
      getUserOrderCount: jest.fn(),
      getOrdersByStatus: jest.fn()
    };

    dynamodbOrderRepo = {
      createOrder: jest.fn(),
      createOrderItem: jest.fn(),
      getOrderById: jest.fn(),
      getUserOrders: jest.fn(),
      updateOrderStatus: jest.fn(),
      getUserOrderCount: jest.fn(),
      getOrdersByStatus: jest.fn()
    };

    mysqlUserRepo = {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      upgradeToSeller: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByUsername: jest.fn(),
      existsByUsername: jest.fn(),
      existsByEmail: jest.fn()
    };

    featureFlagService = new FeatureFlagService();
    wrapper = new OrderDualWriteWrapper(mysqlOrderRepo, dynamodbOrderRepo, mysqlUserRepo, featureFlagService);
    FeatureFlagService.reset();
  });

  describe('createOrder', () => {
    it('should execute dual-write when enabled', async () => {
      FeatureFlagService.setFlag('dual_write_enabled', true);
      mysqlUserRepo.findById.mockResolvedValue(mockUser);
      mysqlOrderRepo.createOrder.mockResolvedValue(mockOrder);
      dynamodbOrderRepo.createOrder.mockResolvedValue(mockOrder);

      const result = await wrapper.createOrder(1, 99.99);

      expect(result.success).toBe(true);
      expect(result.correlationId).toBeDefined();
      expect(mysqlOrderRepo.createOrder).toHaveBeenCalledWith(1, 99.99);
      expect(dynamodbOrderRepo.createOrder).toHaveBeenCalledTimes(1);
    });
  });

  describe('createOrderItem', () => {
    it('should execute dual-write when enabled', async () => {
      FeatureFlagService.setFlag('dual_write_enabled', true);
      mysqlOrderRepo.createOrderItem.mockResolvedValue(mockOrderItem);
      dynamodbOrderRepo.createOrderItem.mockResolvedValue(mockOrderItem);

      const result = await wrapper.createOrderItem(1, 1, 2, 49.99);

      expect(result.success).toBe(true);
      expect(mysqlOrderRepo.createOrderItem).toHaveBeenCalledWith(1, 1, 2, 49.99);
      expect(dynamodbOrderRepo.createOrderItem).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateOrderStatus', () => {
    it('should execute dual-write when enabled', async () => {
      FeatureFlagService.setFlag('dual_write_enabled', true);
      mysqlOrderRepo.updateOrderStatus.mockResolvedValue(true);
      dynamodbOrderRepo.updateOrderStatus.mockResolvedValue(true);

      const result = await wrapper.updateOrderStatus(1, 'completed');

      expect(result.success).toBe(true);
      expect(mysqlOrderRepo.updateOrderStatus).toHaveBeenCalledWith(1, 'completed');
      expect(dynamodbOrderRepo.updateOrderStatus).toHaveBeenCalledWith(1, 'completed');
    });
  });
});
