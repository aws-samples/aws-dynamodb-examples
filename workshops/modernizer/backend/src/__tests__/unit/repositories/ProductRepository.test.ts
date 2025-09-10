import { ProductRepository } from '../../../repositories/ProductRepository';
import { pool, executeWithTracking } from '../../../config/database';
import { CreateProductRequest, UpdateProductRequest } from '../../../models/Product';

// Mock the database pool
jest.mock('../../../config/database', () => ({
  pool: {
    getConnection: jest.fn(),
  },
  executeWithTracking: jest.fn(),
}));

const mockPool = pool as jest.Mocked<typeof pool>;
const mockExecuteWithTracking = executeWithTracking as jest.MockedFunction<typeof executeWithTracking>;

describe('ProductRepository', () => {
  let productRepository: ProductRepository;
  let mockConnection: any;

  beforeEach(() => {
    productRepository = new ProductRepository();
    mockConnection = {
      execute: jest.fn(),
      release: jest.fn(),
    };
    mockPool.getConnection.mockResolvedValue(mockConnection);
    jest.clearAllMocks();
    
    // Default mock for executeWithTracking
    mockExecuteWithTracking.mockResolvedValue({
      results: [],
      executionTime: 10
    });
  });

  describe('createProduct', () => {
    it('should create a product successfully', async () => {
      const sellerId = 1;
      const productData: CreateProductRequest = {
        name: 'Test Product',
        description: 'Test description',
        category_id: 1,
        price: 29.99,
        inventory_quantity: 100,
      };

      // Mock category check and product insert (uses connection.execute)
      mockConnection.execute
        .mockResolvedValueOnce([[{ id: 1 }]]) // Category exists
        .mockResolvedValueOnce([{ insertId: 1 }]); // Product created

      // Mock getProductById call (uses executeWithTracking)
      mockExecuteWithTracking.mockResolvedValueOnce({
        results: [{
          id: 1,
          seller_id: sellerId,
          category_id: 1,
          name: 'Test Product',
          description: 'Test description',
          price: 29.99,
          inventory_quantity: 100,
          created_at: new Date(),
          updated_at: new Date(),
        }],
        executionTime: 10
      });

      const result = await productRepository.createProduct(sellerId, productData);

      expect(result.id).toBe(1);
      expect(result.name).toBe('Test Product');
      expect(mockConnection.execute).toHaveBeenCalledTimes(2);
      expect(mockConnection.release).toHaveBeenCalled();
    });

    it('should throw error if category does not exist', async () => {
      const sellerId = 1;
      const productData: CreateProductRequest = {
        name: 'Test Product',
        category_id: 999,
        price: 29.99,
        inventory_quantity: 100,
      };

      // Mock category check - category not found
      mockConnection.execute.mockResolvedValueOnce([[]]);

      await expect(productRepository.createProduct(sellerId, productData))
        .rejects.toThrow('Category not found');

      expect(mockConnection.release).toHaveBeenCalled();
    });
  });

  describe('getProductById', () => {
    it('should return product if found', async () => {
      const productId = 1;
      const mockProduct = {
        id: 1,
        seller_id: 1,
        category_id: 1,
        name: 'Test Product',
        price: 29.99,
        inventory_quantity: 100,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockExecuteWithTracking.mockResolvedValueOnce({
        results: [mockProduct],
        executionTime: 10
      });

      const result = await productRepository.getProductById(productId);

      expect(result).toEqual(mockProduct);
    });

    it('should return null if product not found', async () => {
      const productId = 999;

      mockExecuteWithTracking.mockResolvedValueOnce({
        results: [],
        executionTime: 10
      });

      const result = await productRepository.getProductById(productId);

      expect(result).toBeNull();
    });
  });

  describe('getProductWithDetails', () => {
    it('should return product with details if found', async () => {
      const productId = 1;
      const mockProductWithDetails = {
        id: 1,
        seller_id: 1,
        category_id: 1,
        name: 'Test Product',
        price: 29.99,
        inventory_quantity: 100,
        category_name: 'Electronics',
        seller_username: 'testseller',
        seller_email: 'seller@test.com',
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockConnection.execute.mockResolvedValueOnce([[mockProductWithDetails]]);

      const result = await productRepository.getProductWithDetails(productId);

      expect(result).toEqual(mockProductWithDetails);
      expect(mockConnection.execute).toHaveBeenCalledWith(
        expect.stringContaining('LEFT JOIN categories'),
        [productId]
      );
      expect(mockConnection.release).toHaveBeenCalled();
    });
  });

  describe('updateProduct', () => {
    it('should update product successfully', async () => {
      const productId = 1;
      const sellerId = 1;
      const updateData: UpdateProductRequest = {
        name: 'Updated Product',
        price: 39.99,
      };

      const mockExistingProduct = {
        id: productId,
        seller_id: sellerId,
        category_id: 1,
        name: 'Test Product',
        price: 29.99,
        inventory_quantity: 100,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const mockUpdatedProduct = {
        ...mockExistingProduct,
        name: 'Updated Product',
        price: 39.99,
      };

      // Mock getProductById calls (uses executeWithTracking)
      mockExecuteWithTracking
        .mockResolvedValueOnce({
          results: [mockExistingProduct],
          executionTime: 10
        }) // Get existing product
        .mockResolvedValueOnce({
          results: [mockUpdatedProduct],
          executionTime: 10
        }); // Get updated product

      // Mock the UPDATE query (uses connection.execute)
      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const result = await productRepository.updateProduct(productId, sellerId, updateData);

      expect(result).toEqual(mockUpdatedProduct);
      expect(mockConnection.execute).toHaveBeenCalledTimes(1);
      expect(mockConnection.release).toHaveBeenCalled();
    });

    it('should throw error if product not found', async () => {
      const productId = 999;
      const sellerId = 1;
      const updateData: UpdateProductRequest = { name: 'Updated Product' };

      // Mock getProductById returning null (uses executeWithTracking)
      mockExecuteWithTracking.mockResolvedValueOnce({
        results: [],
        executionTime: 10
      });

      await expect(productRepository.updateProduct(productId, sellerId, updateData))
        .rejects.toThrow('Product not found');

      expect(mockConnection.release).toHaveBeenCalled();
    });

    it('should throw error if user is not the seller', async () => {
      const productId = 1;
      const sellerId = 2;
      const updateData: UpdateProductRequest = { name: 'Updated Product' };

      const mockExistingProduct = {
        id: productId,
        seller_id: 1, // Different seller
        category_id: 1,
        name: 'Test Product',
        price: 29.99,
        inventory_quantity: 100,
        created_at: new Date(),
        updated_at: new Date(),
      };

      // Mock getProductById (uses executeWithTracking)
      mockExecuteWithTracking.mockResolvedValueOnce({
        results: [mockExistingProduct],
        executionTime: 10
      });

      await expect(productRepository.updateProduct(productId, sellerId, updateData))
        .rejects.toThrow('You can only update your own products');

      expect(mockConnection.release).toHaveBeenCalled();
    });
  });

  describe('deleteProduct', () => {
    it('should delete product successfully', async () => {
      const productId = 1;
      const sellerId = 1;

      const mockExistingProduct = {
        id: productId,
        seller_id: sellerId,
        category_id: 1,
        name: 'Test Product',
        price: 29.99,
        inventory_quantity: 100,
        created_at: new Date(),
        updated_at: new Date(),
      };

      // Mock getProductById (uses executeWithTracking)
      mockExecuteWithTracking.mockResolvedValueOnce({
        results: [mockExistingProduct],
        executionTime: 10
      });

      // Mock DELETE query (uses connection.execute)
      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const result = await productRepository.deleteProduct(productId, sellerId);

      expect(result).toBe(true);
      expect(mockConnection.execute).toHaveBeenCalledTimes(1);
      expect(mockConnection.release).toHaveBeenCalled();
    });

    it('should throw error if user is not the seller', async () => {
      const productId = 1;
      const sellerId = 2;

      const mockExistingProduct = {
        id: productId,
        seller_id: 1, // Different seller
        category_id: 1,
        name: 'Test Product',
        price: 29.99,
        inventory_quantity: 100,
        created_at: new Date(),
        updated_at: new Date(),
      };

      // Mock getProductById (uses executeWithTracking)
      mockExecuteWithTracking.mockResolvedValueOnce({
        results: [mockExistingProduct],
        executionTime: 10
      });

      await expect(productRepository.deleteProduct(productId, sellerId))
        .rejects.toThrow('You can only delete your own products');

      expect(mockConnection.release).toHaveBeenCalled();
    });
  });

  describe('getProducts', () => {
    it('should return products with pagination', async () => {
      const mockProducts = [
        {
          id: 1,
          seller_id: 1,
          category_id: 1,
          name: 'Product 1',
          price: 29.99,
          inventory_quantity: 100,
          category_name: 'Electronics',
          seller_username: 'seller1',
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: 2,
          seller_id: 1,
          category_id: 1,
          name: 'Product 2',
          price: 39.99,
          inventory_quantity: 50,
          category_name: 'Electronics',
          seller_username: 'seller1',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      // Mock executeWithTracking for both count and products queries
      mockExecuteWithTracking
        .mockResolvedValueOnce({
          results: [{ total: 2 }],
          executionTime: 10
        }) // Count query
        .mockResolvedValueOnce({
          results: mockProducts,
          executionTime: 15
        }); // Products query

      const result = await productRepository.getProducts({}, 1, 20);

      expect(result.products).toEqual(mockProducts);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.total_pages).toBe(1);
      // getProducts doesn't use connection, so no release call expected
    });

    it('should apply filters correctly', async () => {
      const filters = {
        category_id: 1,
        search: 'test',
        min_price: 10,
        max_price: 50,
        in_stock_only: true,
      };

      // Mock executeWithTracking for both count and products queries
      mockExecuteWithTracking
        .mockResolvedValueOnce({
          results: [{ total: 1 }],
          executionTime: 10
        }) // Count query
        .mockResolvedValueOnce({
          results: [],
          executionTime: 15
        }); // Products query

      await productRepository.getProducts(filters, 1, 20);

      // Check that the WHERE clause includes all filters
      const countCall = mockExecuteWithTracking.mock.calls[0];
      const productsCall = mockExecuteWithTracking.mock.calls[1];

      expect(countCall[0]).toContain('WHERE');
      expect(countCall[0]).toContain('p.category_id = ?');
      expect(countCall[0]).toContain('p.name LIKE ? OR p.description LIKE ?');
      expect(countCall[0]).toContain('p.price >= ?');
      expect(countCall[0]).toContain('p.price <= ?');
      expect(countCall[0]).toContain('p.inventory_quantity > 0');

      expect(productsCall[0]).toContain('WHERE');
      // getProducts doesn't use connection, so no release call expected
    });
  });

  describe('updateInventory', () => {
    it('should update inventory successfully', async () => {
      const productId = 1;
      const newQuantity = 150;

      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const result = await productRepository.updateInventory(productId, newQuantity);

      expect(result).toBe(true);
      expect(mockConnection.execute).toHaveBeenCalledWith(
        'UPDATE products SET inventory_quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [newQuantity, productId]
      );
      expect(mockConnection.release).toHaveBeenCalled();
    });
  });

  describe('reduceInventory', () => {
    it('should reduce inventory successfully', async () => {
      const productId = 1;
      const quantity = 10;

      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const result = await productRepository.reduceInventory(productId, quantity);

      expect(result).toBe(true);
      expect(mockConnection.execute).toHaveBeenCalledWith(
        expect.stringContaining('inventory_quantity = inventory_quantity - ?'),
        [quantity, productId, quantity]
      );
      expect(mockConnection.release).toHaveBeenCalled();
    });

    it('should return false if insufficient inventory', async () => {
      const productId = 1;
      const quantity = 10;

      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 0 }]);

      const result = await productRepository.reduceInventory(productId, quantity);

      expect(result).toBe(false);
      expect(mockConnection.release).toHaveBeenCalled();
    });
  });

  describe('hasInventory', () => {
    it('should return true if sufficient inventory', async () => {
      const productId = 1;
      const requiredQuantity = 10;

      mockConnection.execute.mockResolvedValueOnce([[{ inventory_quantity: 50 }]]);

      const result = await productRepository.hasInventory(productId, requiredQuantity);

      expect(result).toBe(true);
      expect(mockConnection.release).toHaveBeenCalled();
    });

    it('should return false if insufficient inventory', async () => {
      const productId = 1;
      const requiredQuantity = 100;

      mockConnection.execute.mockResolvedValueOnce([[{ inventory_quantity: 50 }]]);

      const result = await productRepository.hasInventory(productId, requiredQuantity);

      expect(result).toBe(false);
      expect(mockConnection.release).toHaveBeenCalled();
    });

    it('should return false if product not found', async () => {
      const productId = 999;
      const requiredQuantity = 10;

      mockConnection.execute.mockResolvedValueOnce([[]]);

      const result = await productRepository.hasInventory(productId, requiredQuantity);

      expect(result).toBe(false);
      expect(mockConnection.release).toHaveBeenCalled();
    });
  });
});