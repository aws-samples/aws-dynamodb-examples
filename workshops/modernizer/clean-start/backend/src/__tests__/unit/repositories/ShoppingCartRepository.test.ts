import { ShoppingCartRepository } from '../../../repositories/ShoppingCartRepository';
import { pool, executeWithTracking } from '../../../config/database';

// Mock the database pool
jest.mock('../../../config/database', () => ({
  pool: {
    getConnection: jest.fn()
  },
  executeWithTracking: jest.fn(),
}));

const mockExecuteWithTracking = executeWithTracking as jest.MockedFunction<typeof executeWithTracking>;

describe('ShoppingCartRepository', () => {
  let repository: ShoppingCartRepository;
  let mockConnection: any;

  beforeEach(() => {
    repository = new ShoppingCartRepository();
    mockConnection = {
      execute: jest.fn(),
      release: jest.fn()
    };
    (pool.getConnection as jest.Mock).mockResolvedValue(mockConnection);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('addItem', () => {
    it('should add new item to cart when item does not exist', async () => {
      // Mock no existing item
      mockConnection.execute
        .mockResolvedValueOnce([[]]) // No existing items
        .mockResolvedValueOnce([{ insertId: 1, affectedRows: 1 }]); // Insert result

      const result = await repository.addItem(1, 1, 2);

      expect(result).toEqual({
        id: 1,
        userId: 1,
        productId: 1,
        quantity: 2,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date)
      });

      expect(mockConnection.execute).toHaveBeenCalledTimes(2);
      expect(mockConnection.release).toHaveBeenCalled();
    });

    it('should update existing item quantity when item exists', async () => {
      const existingItem = {
        id: 1,
        quantity: 3,
        created_at: new Date('2023-01-01')
      };

      // Mock existing item
      mockConnection.execute
        .mockResolvedValueOnce([[existingItem]]) // Existing item found
        .mockResolvedValueOnce([{ affectedRows: 1 }]); // Update result

      const result = await repository.addItem(1, 1, 2);

      expect(result).toEqual({
        id: 1,
        userId: 1,
        productId: 1,
        quantity: 5, // 3 + 2
        createdAt: existingItem.created_at,
        updatedAt: expect.any(Date)
      });

      expect(mockConnection.execute).toHaveBeenCalledTimes(2);
      expect(mockConnection.release).toHaveBeenCalled();
    });

    it('should throw error when insert fails', async () => {
      mockConnection.execute
        .mockResolvedValueOnce([[]]) // No existing items
        .mockResolvedValueOnce([{ affectedRows: 0 }]); // Insert failed

      await expect(repository.addItem(1, 1, 2)).rejects.toThrow('Failed to add item to cart');
      expect(mockConnection.release).toHaveBeenCalled();
    });

    it('should throw error when update fails', async () => {
      const existingItem = { id: 1, quantity: 3, created_at: new Date() };

      mockConnection.execute
        .mockResolvedValueOnce([[existingItem]]) // Existing item found
        .mockResolvedValueOnce([{ affectedRows: 0 }]); // Update failed

      await expect(repository.addItem(1, 1, 2)).rejects.toThrow('Failed to update cart item');
      expect(mockConnection.release).toHaveBeenCalled();
    });
  });

  describe('getCartItems', () => {
    it('should return cart items with product details', async () => {
      const mockRows = [
        {
          id: 1,
          user_id: 1,
          product_id: 1,
          quantity: 2,
          created_at: new Date('2023-01-01'),
          updated_at: new Date('2023-01-02'),
          seller_id: undefined,
          category_id: undefined,
          product_name: 'Test Product',
          product_description: 'Test Description',
          product_price: '10.99',
          product_inventory: 50,
          product_created_at: undefined,
          product_updated_at: undefined,
          category_name: 'Electronics',
          seller_username: 'seller1',
          seller_email: 'seller1@example.com'
        }
      ];

      mockConnection.execute.mockResolvedValueOnce([mockRows]);

      const result = await repository.getCartItems(1);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 1,
        userId: 1,
        productId: 1,
        quantity: 2,
        createdAt: mockRows[0].created_at,
        updatedAt: mockRows[0].updated_at,
        product: {
          id: 1,
          seller_id: undefined,
          category_id: undefined,
          name: 'Test Product',
          description: 'Test Description',
          price: 10.99,
          inventory_quantity: 50,
          category_name: 'Electronics',
          seller_username: 'seller1',
          seller_email: 'seller1@example.com',
          created_at: undefined,
          updated_at: undefined
        }
      });

      expect(mockConnection.execute).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [1]
      );
      expect(mockConnection.release).toHaveBeenCalled();
    });

    it('should return empty array when no cart items exist', async () => {
      mockConnection.execute.mockResolvedValueOnce([[]]);

      const result = await repository.getCartItems(1);

      expect(result).toHaveLength(0);
      expect(mockConnection.release).toHaveBeenCalled();
    });
  });

  describe('updateItemQuantity', () => {
    it('should update item quantity successfully', async () => {
      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const result = await repository.updateItemQuantity(1, 1, 3);

      expect(result).toBe(true);
      expect(mockConnection.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE shopping_carts SET quantity = ?'),
        [3, 1, 1]
      );
      expect(mockConnection.release).toHaveBeenCalled();
    });

    it('should remove item when quantity is 0', async () => {
      const removeItemSpy = jest.spyOn(repository, 'removeItem').mockResolvedValue(true);

      const result = await repository.updateItemQuantity(1, 1, 0);

      expect(result).toBe(true);
      expect(removeItemSpy).toHaveBeenCalledWith(1, 1);
      expect(mockConnection.release).toHaveBeenCalled();
    });

    it('should return false when no rows affected', async () => {
      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 0 }]);

      const result = await repository.updateItemQuantity(1, 1, 3);

      expect(result).toBe(false);
      expect(mockConnection.release).toHaveBeenCalled();
    });
  });

  describe('removeItem', () => {
    it('should remove item successfully', async () => {
      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const result = await repository.removeItem(1, 1);

      expect(result).toBe(true);
      expect(mockConnection.execute).toHaveBeenCalledWith(
        'DELETE FROM shopping_carts WHERE user_id = ? AND product_id = ?',
        [1, 1]
      );
      expect(mockConnection.release).toHaveBeenCalled();
    });

    it('should return false when no rows affected', async () => {
      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 0 }]);

      const result = await repository.removeItem(1, 1);

      expect(result).toBe(false);
      expect(mockConnection.release).toHaveBeenCalled();
    });
  });

  describe('clearCart', () => {
    it('should clear cart successfully', async () => {
      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 2 }]);

      const result = await repository.clearCart(1);

      expect(result).toBe(true);
      expect(mockConnection.execute).toHaveBeenCalledWith(
        'DELETE FROM shopping_carts WHERE user_id = ?',
        [1]
      );
      expect(mockConnection.release).toHaveBeenCalled();
    });

    it('should return true even when cart is already empty', async () => {
      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 0 }]);

      const result = await repository.clearCart(1);

      expect(result).toBe(true);
      expect(mockConnection.release).toHaveBeenCalled();
    });
  });

  describe('getCartItemCount', () => {
    it('should return correct item count', async () => {
      mockConnection.execute.mockResolvedValueOnce([[{ count: 3 }]]);

      const result = await repository.getCartItemCount(1);

      expect(result).toBe(3);
      expect(mockConnection.execute).toHaveBeenCalledWith(
        'SELECT COUNT(*) as count FROM shopping_carts WHERE user_id = ?',
        [1]
      );
      expect(mockConnection.release).toHaveBeenCalled();
    });
  });

  describe('getCartItemByUserAndProduct', () => {
    it('should return cart item when found', async () => {
      const mockItem = {
        id: 1,
        user_id: 1,
        product_id: 1,
        quantity: 2,
        created_at: new Date('2023-01-01'),
        updated_at: new Date('2023-01-02')
      };

      mockConnection.execute.mockResolvedValueOnce([[mockItem]]);

      const result = await repository.getCartItemByUserAndProduct(1, 1);

      expect(result).toEqual({
        id: 1,
        userId: 1,
        productId: 1,
        quantity: 2,
        createdAt: mockItem.created_at,
        updatedAt: mockItem.updated_at
      });

      expect(mockConnection.release).toHaveBeenCalled();
    });

    it('should return null when item not found', async () => {
      mockConnection.execute.mockResolvedValueOnce([[]]);

      const result = await repository.getCartItemByUserAndProduct(1, 1);

      expect(result).toBeNull();
      expect(mockConnection.release).toHaveBeenCalled();
    });
  });

  describe('validateCartInventory', () => {
    it('should return valid when all items have sufficient inventory', async () => {
      mockConnection.execute.mockResolvedValueOnce([[]]);

      const result = await repository.validateCartInventory(1);

      expect(result).toEqual({
        valid: true,
        issues: []
      });

      expect(mockConnection.release).toHaveBeenCalled();
    });

    it('should return invalid with issues when inventory is insufficient', async () => {
      const mockRows = [
        {
          product_id: 1,
          cart_quantity: 5,
          product_name: 'Test Product',
          available_inventory: 3
        }
      ];

      mockConnection.execute.mockResolvedValueOnce([mockRows]);

      const result = await repository.validateCartInventory(1);

      expect(result).toEqual({
        valid: false,
        issues: ['Test Product: requested 5, but only 3 available']
      });

      expect(mockConnection.release).toHaveBeenCalled();
    });
  });
});