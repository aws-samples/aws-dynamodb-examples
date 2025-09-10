import { ProductService } from '../../../services/ProductService';
import { ProductRepository } from '../../../repositories/ProductRepository';
import { Product, ProductWithDetails } from '../../../models/Product';

// Mock the ProductRepository
jest.mock('../../../repositories/ProductRepository');

describe('ProductService', () => {
  let productService: ProductService;
  let mockProductRepository: jest.Mocked<ProductRepository>;

  beforeEach(() => {
    productService = new ProductService();
    mockProductRepository = new ProductRepository() as jest.Mocked<ProductRepository>;
    (productService as any).productRepository = mockProductRepository;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createProduct', () => {
    it('should create a product successfully', async () => {
      const sellerId = 1;
      const productData = {
        name: 'Test Product',
        description: 'Test description',
        category_id: 1,
        price: 29.99,
        inventory_quantity: 100,
      };

      const mockCreatedProduct: Product = {
        id: 1,
        seller_id: sellerId,
        category_id: 1,
        name: 'Test Product',
        description: 'Test description',
        price: 29.99,
        inventory_quantity: 100,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockProductRepository.createProduct.mockResolvedValue(mockCreatedProduct);

      const result = await productService.createProduct(sellerId, productData);

      expect(result).toEqual(mockCreatedProduct);
      expect(mockProductRepository.createProduct).toHaveBeenCalledWith(
        sellerId,
        productData
      );
    });

    it('should throw error for invalid product data', async () => {
      const sellerId = 1;
      const invalidProductData = {
        name: '', // Invalid: empty name
        category_id: 1,
        price: 29.99,
        inventory_quantity: 100,
      };

      await expect(productService.createProduct(sellerId, invalidProductData))
        .rejects.toThrow('Product name is required');

      expect(mockProductRepository.createProduct).not.toHaveBeenCalled();
    });

    it('should handle repository errors', async () => {
      const sellerId = 1;
      const productData = {
        name: 'Test Product',
        category_id: 1,
        price: 29.99,
        inventory_quantity: 100,
      };

      mockProductRepository.createProduct.mockRejectedValue(new Error('Database error'));

      await expect(productService.createProduct(sellerId, productData))
        .rejects.toThrow('Database error');
    });
  });

  describe('getProductById', () => {
    it('should return product if found', async () => {
      const productId = 1;
      const mockProduct: ProductWithDetails = {
        id: 1,
        seller_id: 1,
        category_id: 1,
        name: 'Test Product',
        price: 29.99,
        inventory_quantity: 100,
        category_name: 'Electronics',
        seller_username: 'testseller',
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockProductRepository.getProductWithDetails.mockResolvedValue(mockProduct);

      const result = await productService.getProductById(productId);

      expect(result).toEqual(mockProduct);
      expect(mockProductRepository.getProductWithDetails).toHaveBeenCalledWith(productId);
    });

    it('should return null if product not found', async () => {
      const productId = 999;

      mockProductRepository.getProductWithDetails.mockResolvedValue(null);

      const result = await productService.getProductById(productId);

      expect(result).toBeNull();
    });

    it('should throw error for invalid product ID', async () => {
      const invalidProductId = -1;

      await expect(productService.getProductById(invalidProductId))
        .rejects.toThrow('Invalid product ID');

      expect(mockProductRepository.getProductWithDetails).not.toHaveBeenCalled();
    });
  });

  describe('updateProduct', () => {
    it('should update product successfully', async () => {
      const productId = 1;
      const sellerId = 1;
      const updateData = {
        name: 'Updated Product',
        price: 39.99,
      };

      const mockUpdatedProduct: Product = {
        id: productId,
        seller_id: sellerId,
        category_id: 1,
        name: 'Updated Product',
        price: 39.99,
        inventory_quantity: 100,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockProductRepository.updateProduct.mockResolvedValue(mockUpdatedProduct);

      const result = await productService.updateProduct(productId, sellerId, updateData);

      expect(result).toEqual(mockUpdatedProduct);
      expect(mockProductRepository.updateProduct).toHaveBeenCalledWith(
        productId,
        sellerId,
        updateData
      );
    });

    it('should throw error for invalid product ID', async () => {
      const invalidProductId = 0;
      const sellerId = 1;
      const updateData = { name: 'Updated Product' };

      await expect(productService.updateProduct(invalidProductId, sellerId, updateData))
        .rejects.toThrow('Invalid product ID');

      expect(mockProductRepository.updateProduct).not.toHaveBeenCalled();
    });

    it('should throw error for empty update data', async () => {
      const productId = 1;
      const sellerId = 1;
      const emptyUpdateData = {};

      await expect(productService.updateProduct(productId, sellerId, emptyUpdateData))
        .rejects.toThrow('No valid fields provided for update');

      expect(mockProductRepository.updateProduct).not.toHaveBeenCalled();
    });
  });

  describe('deleteProduct', () => {
    it('should delete product successfully', async () => {
      const productId = 1;
      const sellerId = 1;

      mockProductRepository.deleteProduct.mockResolvedValue(true);

      const result = await productService.deleteProduct(productId, sellerId);

      expect(result).toBe(true);
      expect(mockProductRepository.deleteProduct).toHaveBeenCalledWith(productId, sellerId);
    });

    it('should throw error for invalid product ID', async () => {
      const invalidProductId = -1;
      const sellerId = 1;

      await expect(productService.deleteProduct(invalidProductId, sellerId))
        .rejects.toThrow('Invalid product ID');

      expect(mockProductRepository.deleteProduct).not.toHaveBeenCalled();
    });
  });

  describe('getProducts', () => {
    it('should return products with pagination', async () => {
      const mockResult = {
        products: [
          {
            id: 1,
            seller_id: 1,
            category_id: 1,
            name: 'Product 1',
            price: 29.99,
            inventory_quantity: 100,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
        total_pages: 1,
      };

      mockProductRepository.getProducts.mockResolvedValue(mockResult);

      const result = await productService.getProducts({}, 1, 20);

      expect(result).toEqual(mockResult);
      expect(mockProductRepository.getProducts).toHaveBeenCalledWith({}, 1, 20);
    });

    it('should validate and sanitize filters', async () => {
      const filters = {
        category_id: 1,
        seller_id: 2,
        search: '  test search  ',
        min_price: 10.5,
        max_price: 50.99,
        in_stock_only: true,
      };

      const mockResult = {
        products: [],
        total: 0,
        page: 1,
        limit: 20,
        total_pages: 0,
      };

      mockProductRepository.getProducts.mockResolvedValue(mockResult);

      await productService.getProducts(filters, 1, 20);

      expect(mockProductRepository.getProducts).toHaveBeenCalledWith(
        {
          category_id: 1,
          seller_id: 2,
          search: 'test search',
          min_price: 10.5,
          max_price: 50.99,
          in_stock_only: true,
        },
        1,
        20
      );
    });

    it('should handle invalid pagination parameters', async () => {
      const mockResult = {
        products: [],
        total: 0,
        page: 1,
        limit: 20,
        total_pages: 0,
      };

      mockProductRepository.getProducts.mockResolvedValue(mockResult);

      await productService.getProducts({}, -1, 200);

      expect(mockProductRepository.getProducts).toHaveBeenCalledWith({}, 1, 20);
    });
  });

  describe('searchProducts', () => {
    it('should search products successfully', async () => {
      const searchTerm = 'laptop';
      const mockResult = {
        products: [
          {
            id: 1,
            seller_id: 1,
            category_id: 1,
            name: 'Gaming Laptop',
            price: 999.99,
            inventory_quantity: 10,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
        total_pages: 1,
      };

      mockProductRepository.searchProducts.mockResolvedValue(mockResult);

      const result = await productService.searchProducts(searchTerm, 1, 20);

      expect(result).toEqual(mockResult);
      expect(mockProductRepository.searchProducts).toHaveBeenCalledWith(searchTerm, 1, 20);
    });

    it('should throw error for empty search term', async () => {
      const emptySearchTerm = '   ';

      await expect(productService.searchProducts(emptySearchTerm, 1, 20))
        .rejects.toThrow('Search term cannot be empty');

      expect(mockProductRepository.searchProducts).not.toHaveBeenCalled();
    });

    it('should throw error for search term too long', async () => {
      const longSearchTerm = 'a'.repeat(101);

      await expect(productService.searchProducts(longSearchTerm, 1, 20))
        .rejects.toThrow('Search term is too long');

      expect(mockProductRepository.searchProducts).not.toHaveBeenCalled();
    });
  });

  describe('updateInventory', () => {
    it('should update inventory successfully', async () => {
      const productId = 1;
      const sellerId = 1;
      const newQuantity = 150;

      const mockProduct: Product = {
        id: productId,
        seller_id: sellerId,
        category_id: 1,
        name: 'Test Product',
        price: 29.99,
        inventory_quantity: 100,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockProductRepository.getProductById.mockResolvedValue(mockProduct);
      mockProductRepository.updateInventory.mockResolvedValue(true);

      const result = await productService.updateInventory(productId, sellerId, newQuantity);

      expect(result).toBe(true);
      expect(mockProductRepository.getProductById).toHaveBeenCalledWith(productId);
      expect(mockProductRepository.updateInventory).toHaveBeenCalledWith(productId, newQuantity);
    });

    it('should throw error if product not found', async () => {
      const productId = 999;
      const sellerId = 1;
      const newQuantity = 150;

      mockProductRepository.getProductById.mockResolvedValue(null);

      await expect(productService.updateInventory(productId, sellerId, newQuantity))
        .rejects.toThrow('Product not found');

      expect(mockProductRepository.updateInventory).not.toHaveBeenCalled();
    });

    it('should throw error if user is not the seller', async () => {
      const productId = 1;
      const sellerId = 2;
      const newQuantity = 150;

      const mockProduct: Product = {
        id: productId,
        seller_id: 1, // Different seller
        category_id: 1,
        name: 'Test Product',
        price: 29.99,
        inventory_quantity: 100,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockProductRepository.getProductById.mockResolvedValue(mockProduct);

      await expect(productService.updateInventory(productId, sellerId, newQuantity))
        .rejects.toThrow('You can only update inventory for your own products');

      expect(mockProductRepository.updateInventory).not.toHaveBeenCalled();
    });

    it('should throw error for invalid inventory quantity', async () => {
      const productId = 1;
      const sellerId = 1;
      const invalidQuantity = -10;

      await expect(productService.updateInventory(productId, sellerId, invalidQuantity))
        .rejects.toThrow('Inventory quantity must be a non-negative integer');

      expect(mockProductRepository.getProductById).not.toHaveBeenCalled();
    });
  });

  describe('checkAvailability', () => {
    it('should return true if product has sufficient inventory', async () => {
      const productId = 1;
      const requiredQuantity = 10;

      mockProductRepository.hasInventory.mockResolvedValue(true);

      const result = await productService.checkAvailability(productId, requiredQuantity);

      expect(result).toBe(true);
      expect(mockProductRepository.hasInventory).toHaveBeenCalledWith(productId, requiredQuantity);
    });

    it('should return false if product has insufficient inventory', async () => {
      const productId = 1;
      const requiredQuantity = 100;

      mockProductRepository.hasInventory.mockResolvedValue(false);

      const result = await productService.checkAvailability(productId, requiredQuantity);

      expect(result).toBe(false);
    });

    it('should throw error for invalid required quantity', async () => {
      const productId = 1;
      const invalidQuantity = 0;

      await expect(productService.checkAvailability(productId, invalidQuantity))
        .rejects.toThrow('Required quantity must be a positive integer');

      expect(mockProductRepository.hasInventory).not.toHaveBeenCalled();
    });
  });

  describe('getSellerProductStats', () => {
    it('should return seller product statistics', async () => {
      const sellerId = 1;
      const mockProducts = {
        products: [
          {
            id: 1,
            seller_id: sellerId,
            category_id: 1,
            name: 'Product 1',
            price: 29.99,
            inventory_quantity: 100,
            created_at: new Date(),
            updated_at: new Date(),
          },
          {
            id: 2,
            seller_id: sellerId,
            category_id: 1,
            name: 'Product 2',
            price: 39.99,
            inventory_quantity: 0, // Out of stock
            created_at: new Date(),
            updated_at: new Date(),
          },
          {
            id: 3,
            seller_id: sellerId,
            category_id: 1,
            name: 'Product 3',
            price: 19.99,
            inventory_quantity: 50,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
        total: 3,
        page: 1,
        limit: 999999,
        total_pages: 1,
      };

      mockProductRepository.getProductsBySeller.mockResolvedValue(mockProducts);

      const result = await productService.getSellerProductStats(sellerId);

      expect(result).toEqual({
        total_products: 3,
        in_stock_products: 2,
        out_of_stock_products: 1,
        total_inventory_value: 29.99 * 100 + 19.99 * 50, // Only in-stock products
      });
    });

    it('should throw error for invalid seller ID', async () => {
      const invalidSellerId = -1;

      await expect(productService.getSellerProductStats(invalidSellerId))
        .rejects.toThrow('Invalid seller ID');

      expect(mockProductRepository.getProductsBySeller).not.toHaveBeenCalled();
    });
  });
});