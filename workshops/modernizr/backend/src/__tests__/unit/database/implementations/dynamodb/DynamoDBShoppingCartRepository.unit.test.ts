import { DynamoDBShoppingCartRepository } from '../../../../../database/implementations/dynamodb/DynamoDBShoppingCartRepository';

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

describe('DynamoDBShoppingCartRepository Unit Tests', () => {
  let repository: DynamoDBShoppingCartRepository;

  beforeEach(() => {
    repository = new DynamoDBShoppingCartRepository('shopping_carts');
    mockSend.mockClear();
  });

  describe('addItem', () => {
    it('should add item to cart', async () => {
      mockSend.mockResolvedValue({});

      const result = await repository.addItem(1, 100, 2);

      expect(result.userId).toBe(1);
      expect(result.productId).toBe(100);
      expect(result.quantity).toBe(2);
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(mockSend).toHaveBeenCalled();
    });
  });

  describe('getCartItems', () => {
    it('should return cart items for user', async () => {
      const mockItems = [
        {
          PK: 'USER#1',
          SK: 'CART#100',
          id: 1,
          userId: 1,
          productId: 100,
          quantity: 2,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z'
        }
      ];

      mockSend.mockResolvedValue({ Items: mockItems });

      const result = await repository.getCartItems(1);

      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe(1);
      expect(result[0].productId).toBe(100);
      expect(result[0].quantity).toBe(2);
    });
  });

  describe('updateItemQuantity', () => {
    it('should update item quantity', async () => {
      mockSend.mockResolvedValue({});

      const result = await repository.updateItemQuantity(1, 100, 5);

      expect(result).toBe(true);
      expect(mockSend).toHaveBeenCalled();
    });

    it('should return false on error', async () => {
      mockSend.mockRejectedValue(new Error('Update failed'));

      const result = await repository.updateItemQuantity(1, 100, 5);

      expect(result).toBe(false);
    });
  });

  describe('removeItem', () => {
    it('should remove item from cart', async () => {
      mockSend.mockResolvedValue({});

      const result = await repository.removeItem(1, 100);

      expect(result).toBe(true);
      expect(mockSend).toHaveBeenCalled();
    });
  });

  describe('getCartItemCount', () => {
    it('should return total quantity of items in cart', async () => {
      const mockItems = [
        { quantity: 2 },
        { quantity: 3 },
        { quantity: 1 }
      ];

      mockSend.mockResolvedValue({ Items: mockItems });

      const result = await repository.getCartItemCount(1);

      expect(result).toBe(6);
    });
  });

  describe('clearCart', () => {
    it('should clear all items from cart', async () => {
      const mockItems = [
        { PK: 'USER#1', SK: 'CART#100' },
        { PK: 'USER#1', SK: 'CART#101' }
      ];

      mockSend.mockResolvedValueOnce({ Items: mockItems }); // query
      mockSend.mockResolvedValue({}); // delete operations

      const result = await repository.clearCart(1);

      expect(result).toBe(true);
      expect(mockSend).toHaveBeenCalledTimes(3); // 1 query + 2 deletes
    });
  });

  describe('getCartItemByUserAndProduct', () => {
    it('should return specific cart item', async () => {
      const mockItem = {
        id: 1,
        userId: 1,
        productId: 100,
        quantity: 2,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      };

      mockSend.mockResolvedValue({ Item: mockItem });

      const result = await repository.getCartItemByUserAndProduct(1, 100);

      expect(result).toEqual({
        id: 1,
        userId: 1,
        productId: 100,
        quantity: 2,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-01T00:00:00.000Z')
      });
    });

    it('should return null when item not found', async () => {
      mockSend.mockResolvedValue({});

      const result = await repository.getCartItemByUserAndProduct(1, 999);

      expect(result).toBeNull();
    });
  });
});
