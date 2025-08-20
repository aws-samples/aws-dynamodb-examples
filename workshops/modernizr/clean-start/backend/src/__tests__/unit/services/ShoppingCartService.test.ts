import { ShoppingCartService } from '../../../services/ShoppingCartService';
import { ShoppingCartRepository } from '../../../repositories/ShoppingCartRepository';
import { ProductRepository } from '../../../repositories/ProductRepository';

// Mock the repositories
jest.mock('../../../repositories/ShoppingCartRepository');
jest.mock('../../../repositories/ProductRepository');

describe('ShoppingCartService', () => {
  let service: ShoppingCartService;
  let mockCartRepository: jest.Mocked<ShoppingCartRepository>;
  let mockProductRepository: jest.Mocked<ProductRepository>;

  beforeEach(() => {
    service = new ShoppingCartService();
    mockCartRepository = new ShoppingCartRepository() as jest.Mocked<ShoppingCartRepository>;
    mockProductRepository = new ProductRepository() as jest.Mocked<ProductRepository>;
    
    // Replace the repositories with mocks
    (service as any).cartRepository = mockCartRepository;
    (service as any).productRepository = mockProductRepository;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('addToCart', () => {
    const mockProduct = {
      id: 1,
      seller_id: 1,
      category_id: 1,
      name: 'Test Product',
      description: 'Test Description',
      price: 10.99,
      inventory_quantity: 50,
      created_at: new Date(),
      updated_at: new Date()
    };

    it('should add item to cart successfully', async () => {
      const request = { productId: 1, quantity: 2 };
      const mockCartItems = [
        {
          id: 1,
          userId: 1,
          productId: 1,
          quantity: 2,
          createdAt: new Date(),
          updatedAt: new Date(),
          product: {
            ...mockProduct,
            category_name: 'Electronics',
            seller_username: 'seller1',
            seller_email: 'seller1@example.com'
          }
        }
      ];

      mockProductRepository.getProductById.mockResolvedValue(mockProduct);
      mockCartRepository.getCartItemByUserAndProduct.mockResolvedValue(null);
      mockCartRepository.addItem.mockResolvedValue({
        id: 1,
        userId: 1,
        productId: 1,
        quantity: 2,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      mockCartRepository.getCartItems.mockResolvedValue(mockCartItems);

      const result = await service.addToCart(1, request);

      expect(result.items).toHaveLength(1);
      expect(result.totalItems).toBe(2);
      expect(result.totalAmount).toBe(21.98);
      expect(mockProductRepository.getProductById).toHaveBeenCalledWith(1);
      expect(mockCartRepository.addItem).toHaveBeenCalledWith(1, 1, 2);
    });

    it('should throw error for invalid product ID', async () => {
      const request = { productId: 0, quantity: 2 };

      await expect(service.addToCart(1, request)).rejects.toThrow('Valid product ID is required');
    });

    it('should throw error when product not found', async () => {
      const request = { productId: 1, quantity: 2 };

      mockProductRepository.getProductById.mockResolvedValue(null);

      await expect(service.addToCart(1, request)).rejects.toThrow('Product not found');
    });
  });

  describe('getCart', () => {
    it('should return cart with correct totals', async () => {
      const mockCartItems = [
        {
          id: 1,
          userId: 1,
          productId: 1,
          quantity: 2,
          createdAt: new Date(),
          updatedAt: new Date(),
          product: {
            id: 1,
            seller_id: 1,
            category_id: 1,
            name: 'Product 1',
            description: 'Description 1',
            price: 10.99,
            inventory_quantity: 50,
            category_name: 'Electronics',
            seller_username: 'seller1',
            seller_email: 'seller1@example.com',
            created_at: new Date(),
            updated_at: new Date()
          }
        }
      ];

      mockCartRepository.getCartItems.mockResolvedValue(mockCartItems);

      const result = await service.getCart(1);

      expect(result.items).toHaveLength(1);
      expect(result.totalItems).toBe(2);
      expect(result.totalAmount).toBe(21.98);
      expect(mockCartRepository.getCartItems).toHaveBeenCalledWith(1);
    });

    it('should return empty cart when no items', async () => {
      mockCartRepository.getCartItems.mockResolvedValue([]);

      const result = await service.getCart(1);

      expect(result.items).toHaveLength(0);
      expect(result.totalItems).toBe(0);
      expect(result.totalAmount).toBe(0);
    });
  });

  describe('clearCart', () => {
    it('should clear cart successfully', async () => {
      mockCartRepository.clearCart.mockResolvedValue(true);

      await service.clearCart(1);

      expect(mockCartRepository.clearCart).toHaveBeenCalledWith(1);
    });
  });
});