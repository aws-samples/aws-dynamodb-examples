import { MySQLProductRepository } from '../../../../../database/implementations/mysql/MySQLProductRepository';
import { ProductRepository } from '../../../../../repositories/ProductRepository';
import { Product, ProductWithDetails, CreateProductRequest, ProductListResponse } from '../../../../../models/Product';

jest.mock('../../../../../repositories/ProductRepository');

describe('MySQLProductRepository', () => {
  let mysqlProductRepository: MySQLProductRepository;
  let mockProductRepository: jest.Mocked<ProductRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockProductRepository = new ProductRepository() as jest.Mocked<ProductRepository>;
    mysqlProductRepository = new MySQLProductRepository();
    (mysqlProductRepository as any).productRepository = mockProductRepository;
  });

  describe('createProduct', () => {
    it('should delegate to ProductRepository.createProduct', async () => {
      const sellerId = 1;
      const productData: CreateProductRequest = {
        name: 'Test Product',
        description: 'Test Description',
        category_id: 1,
        price: 99.99,
        inventory_quantity: 10
      };
      const mockProduct: Product = { 
        id: 1, seller_id: sellerId, name: 'Test Product', category_id: 1, 
        price: 99.99, inventory_quantity: 10, created_at: new Date(), updated_at: new Date() 
      };

      mockProductRepository.createProduct.mockResolvedValueOnce(mockProduct);

      const result = await mysqlProductRepository.createProduct(sellerId, productData);

      expect(result).toEqual(mockProduct);
      expect(mockProductRepository.createProduct).toHaveBeenCalledWith(sellerId, productData);
    });
  });

  describe('getProductById', () => {
    it('should delegate to ProductRepository.getProductById', async () => {
      const productId = 1;
      const mockProduct: Product = { 
        id: productId, seller_id: 1, name: 'Test', category_id: 1, 
        price: 99.99, inventory_quantity: 10, created_at: new Date(), updated_at: new Date() 
      };

      mockProductRepository.getProductById.mockResolvedValueOnce(mockProduct);

      const result = await mysqlProductRepository.getProductById(productId);

      expect(result).toEqual(mockProduct);
      expect(mockProductRepository.getProductById).toHaveBeenCalledWith(productId);
    });
  });

  describe('getProductWithDetails', () => {
    it('should delegate to ProductRepository.getProductWithDetails', async () => {
      const productId = 1;
      const mockProductDetails: ProductWithDetails = { 
        id: productId, seller_id: 1, category_id: 1, name: 'Test Product', 
        price: 99.99, inventory_quantity: 10, created_at: new Date(), updated_at: new Date(),
        category_name: 'Electronics'
      };

      mockProductRepository.getProductWithDetails.mockResolvedValueOnce(mockProductDetails);

      const result = await mysqlProductRepository.getProductWithDetails(productId);

      expect(result).toEqual(mockProductDetails);
      expect(mockProductRepository.getProductWithDetails).toHaveBeenCalledWith(productId);
    });
  });

  describe('updateProduct', () => {
    it('should delegate to ProductRepository.updateProduct', async () => {
      const productId = 1;
      const sellerId = 1;
      const updateData = { name: 'Updated Product' };
      const mockProduct: Product = { 
        id: productId, seller_id: sellerId, name: 'Updated Product', category_id: 1, 
        price: 99.99, inventory_quantity: 10, created_at: new Date(), updated_at: new Date() 
      };

      mockProductRepository.updateProduct.mockResolvedValueOnce(mockProduct);

      const result = await mysqlProductRepository.updateProduct(productId, sellerId, updateData);

      expect(result).toEqual(mockProduct);
      expect(mockProductRepository.updateProduct).toHaveBeenCalledWith(productId, sellerId, updateData);
    });
  });

  describe('deleteProduct', () => {
    it('should delegate to ProductRepository.deleteProduct', async () => {
      const productId = 1;
      const sellerId = 1;

      mockProductRepository.deleteProduct.mockResolvedValueOnce(true);

      const result = await mysqlProductRepository.deleteProduct(productId, sellerId);

      expect(result).toBe(true);
      expect(mockProductRepository.deleteProduct).toHaveBeenCalledWith(productId, sellerId);
    });
  });

  describe('getProductsBySeller', () => {
    it('should delegate to ProductRepository.getProductsBySeller', async () => {
      const sellerId = 1;
      const page = 1;
      const limit = 20;
      const mockResponse: ProductListResponse = {
        products: [],
        total: 0,
        page: 1,
        limit: 20,
        total_pages: 0
      };

      mockProductRepository.getProductsBySeller.mockResolvedValueOnce(mockResponse);

      const result = await mysqlProductRepository.getProductsBySeller(sellerId, page, limit);

      expect(result).toEqual(mockResponse);
      expect(mockProductRepository.getProductsBySeller).toHaveBeenCalledWith(sellerId, page, limit);
    });
  });

  describe('searchProducts', () => {
    it('should delegate to ProductRepository.searchProducts', async () => {
      const searchTerm = 'test';
      const page = 1;
      const limit = 20;
      const mockResponse: ProductListResponse = {
        products: [],
        total: 0,
        page: 1,
        limit: 20,
        total_pages: 0
      };

      mockProductRepository.searchProducts.mockResolvedValueOnce(mockResponse);

      const result = await mysqlProductRepository.searchProducts(searchTerm, page, limit);

      expect(result).toEqual(mockResponse);
      expect(mockProductRepository.searchProducts).toHaveBeenCalledWith(searchTerm, page, limit);
    });
  });

  describe('updateInventory', () => {
    it('should delegate to ProductRepository.updateInventory', async () => {
      const productId = 1;
      const newQuantity = 20;

      mockProductRepository.updateInventory.mockResolvedValueOnce(true);

      const result = await mysqlProductRepository.updateInventory(productId, newQuantity);

      expect(result).toBe(true);
      expect(mockProductRepository.updateInventory).toHaveBeenCalledWith(productId, newQuantity);
    });
  });
});
