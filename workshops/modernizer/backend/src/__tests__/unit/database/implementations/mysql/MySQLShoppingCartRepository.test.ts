import { MySQLShoppingCartRepository } from '../../../../../database/implementations/mysql/MySQLShoppingCartRepository';
import { ShoppingCartRepository } from '../../../../../repositories/ShoppingCartRepository';
import { ShoppingCartItem, ShoppingCartItemWithProduct } from '../../../../../models/ShoppingCart';
import { ProductWithDetails } from '../../../../../models/Product';

jest.mock('../../../../../repositories/ShoppingCartRepository');

describe('MySQLShoppingCartRepository', () => {
  let mysqlShoppingCartRepository: MySQLShoppingCartRepository;
  let mockShoppingCartRepository: jest.Mocked<ShoppingCartRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockShoppingCartRepository = new ShoppingCartRepository() as jest.Mocked<ShoppingCartRepository>;
    mysqlShoppingCartRepository = new MySQLShoppingCartRepository();
    (mysqlShoppingCartRepository as any).shoppingCartRepository = mockShoppingCartRepository;
  });

  describe('getCartItems', () => {
    it('should delegate to ShoppingCartRepository.getCartItems', async () => {
      const userId = 1;
      const mockProduct: ProductWithDetails = {
        id: 1, seller_id: 1, category_id: 1, name: 'Test Product', price: 99.99, 
        inventory_quantity: 10, created_at: new Date(), updated_at: new Date()
      };
      const mockCartItems: ShoppingCartItemWithProduct[] = [
        { 
          id: 1, userId, productId: 1, quantity: 2, 
          createdAt: new Date(), updatedAt: new Date(),
          product: mockProduct
        }
      ];

      mockShoppingCartRepository.getCartItems.mockResolvedValueOnce(mockCartItems);

      const result = await mysqlShoppingCartRepository.getCartItems(userId);

      expect(result).toEqual(mockCartItems);
      expect(mockShoppingCartRepository.getCartItems).toHaveBeenCalledWith(userId);
    });
  });

  describe('addItem', () => {
    it('should delegate to ShoppingCartRepository.addItem', async () => {
      const userId = 1;
      const productId = 1;
      const quantity = 2;
      const mockCartItem: ShoppingCartItem = { 
        id: 1, userId, productId, quantity, 
        createdAt: new Date(), updatedAt: new Date()
      };

      mockShoppingCartRepository.addItem.mockResolvedValueOnce(mockCartItem);

      const result = await mysqlShoppingCartRepository.addItem(userId, productId, quantity);

      expect(result).toEqual(mockCartItem);
      expect(mockShoppingCartRepository.addItem).toHaveBeenCalledWith(userId, productId, quantity);
    });
  });

  describe('updateItemQuantity', () => {
    it('should delegate to ShoppingCartRepository.updateItemQuantity', async () => {
      const userId = 1;
      const productId = 1;
      const quantity = 3;

      mockShoppingCartRepository.updateItemQuantity.mockResolvedValueOnce(true);

      const result = await mysqlShoppingCartRepository.updateItemQuantity(userId, productId, quantity);

      expect(result).toBe(true);
      expect(mockShoppingCartRepository.updateItemQuantity).toHaveBeenCalledWith(userId, productId, quantity);
    });
  });

  describe('removeItem', () => {
    it('should delegate to ShoppingCartRepository.removeItem', async () => {
      const userId = 1;
      const productId = 1;

      mockShoppingCartRepository.removeItem.mockResolvedValueOnce(true);

      const result = await mysqlShoppingCartRepository.removeItem(userId, productId);

      expect(result).toBe(true);
      expect(mockShoppingCartRepository.removeItem).toHaveBeenCalledWith(userId, productId);
    });
  });

  describe('clearCart', () => {
    it('should delegate to ShoppingCartRepository.clearCart', async () => {
      const userId = 1;

      mockShoppingCartRepository.clearCart.mockResolvedValueOnce(true);

      const result = await mysqlShoppingCartRepository.clearCart(userId);

      expect(result).toBe(true);
      expect(mockShoppingCartRepository.clearCart).toHaveBeenCalledWith(userId);
    });
  });

  describe('getCartItemCount', () => {
    it('should delegate to ShoppingCartRepository.getCartItemCount', async () => {
      const userId = 1;

      mockShoppingCartRepository.getCartItemCount.mockResolvedValueOnce(3);

      const result = await mysqlShoppingCartRepository.getCartItemCount(userId);

      expect(result).toBe(3);
      expect(mockShoppingCartRepository.getCartItemCount).toHaveBeenCalledWith(userId);
    });
  });
});
