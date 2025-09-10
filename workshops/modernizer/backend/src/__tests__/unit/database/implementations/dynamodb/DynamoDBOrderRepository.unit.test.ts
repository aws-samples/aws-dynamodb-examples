import { DynamoDBOrderRepository } from '../../../../../database/implementations/dynamodb/DynamoDBOrderRepository';

// Mock the DynamoDB client
const mockSend = jest.fn();
const mockClient = {
  send: mockSend,
};

// Mock the DynamoDBClientManager
jest.mock('../../../../../database/config/DynamoDBClient', () => ({
  DynamoDBClientManager: {
    getClient: () => mockClient,
    getTableName: (tableName: string) => `test_${tableName}`,
  },
}));

describe('DynamoDBOrderRepository Unit Tests', () => {
  let repository: DynamoDBOrderRepository;

  beforeEach(() => {
    repository = new DynamoDBOrderRepository('orders');
    mockSend.mockClear();
  });

  describe('createOrder', () => {
    it('should create order with generated ID', async () => {
      mockSend.mockResolvedValue({});

      const result = await repository.createOrder(1, 99.99);

      expect(result.user_id).toBe(1);
      expect(result.total_amount).toBe(99.99);
      expect(result.status).toBe('pending');
      expect(result.id).toBeDefined();
      expect(mockSend).toHaveBeenCalled();
    });
  });

  describe('createOrderItem', () => {
    it('should create order item with generated ID', async () => {
      mockSend.mockResolvedValue({});

      const result = await repository.createOrderItem(1, 2, 3, 29.99);

      expect(result.order_id).toBe(1);
      expect(result.product_id).toBe(2);
      expect(result.quantity).toBe(3);
      expect(result.price_at_time).toBe(29.99);
      expect(result.id).toBeDefined();
      expect(mockSend).toHaveBeenCalled();
    });
  });

  describe('getOrderById', () => {
    it('should return order with items when found', async () => {
      const mockOrder = {
        PK: 'ORDER#1',
        SK: '#META',
        id: 1,
        user_id: 1,
        total_amount: 99.99,
        status: 'pending',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z'
      };

      const mockItems = [
        {
          PK: 'ORDER#1',
          SK: 'ITEM#1',
          id: 1,
          order_id: 1,
          product_id: 2,
          quantity: 3,
          price_at_time: 29.99
        }
      ];

      mockSend
        .mockResolvedValueOnce({ Item: mockOrder })
        .mockResolvedValueOnce({ Items: mockItems });

      const result = await repository.getOrderById(1);

      expect(result).not.toBeNull();
      expect(result!.id).toBe(1);
      expect(result!.items).toHaveLength(1);
    });

    it('should return null when order not found', async () => {
      mockSend.mockResolvedValue({});

      const result = await repository.getOrderById(999);

      expect(result).toBeNull();
    });
  });

  describe('updateOrderStatus', () => {
    it('should update order status', async () => {
      mockSend.mockResolvedValue({});

      const result = await repository.updateOrderStatus(1, 'completed');

      expect(result).toBe(true);
      expect(mockSend).toHaveBeenCalled();
    });
  });

  describe('getUserOrders', () => {
    it('should return user orders', async () => {
      const mockOrders = [
        {
          PK: 'ORDER#1',
          SK: '#META',
          id: 1,
          user_id: 1,
          total_amount: 99.99,
          status: 'pending',
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z'
        }
      ];

      mockSend
        .mockResolvedValueOnce({ Items: mockOrders })
        .mockResolvedValueOnce({ Items: [] });

      const result = await repository.getUserOrders(1);

      expect(result).toHaveLength(1);
      expect(result[0].user_id).toBe(1);
    });
  });

  describe('getUserOrderCount', () => {
    it('should return user order count', async () => {
      const mockOrders = [
        { id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }
      ];
      mockSend.mockResolvedValue({ Items: mockOrders });

      const result = await repository.getUserOrderCount(1);

      expect(result).toBe(5);
    });
  });

  describe('getOrdersByStatus', () => {
    it('should return orders by status', async () => {
      const mockOrders = [
        {
          PK: 'ORDER#1',
          SK: '#META',
          id: 1,
          user_id: 1,
          status: 'completed',
          total_amount: 99.99,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z'
        }
      ];

      mockSend
        .mockResolvedValueOnce({ Items: mockOrders })
        .mockResolvedValueOnce({ Items: [] });

      const result = await repository.getOrdersByStatus('completed');

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('completed');
    });
  });
});
