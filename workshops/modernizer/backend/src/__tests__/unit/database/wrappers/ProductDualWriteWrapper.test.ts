import { ProductDualWriteWrapper } from '../../../../database/wrappers/ProductDualWriteWrapper';
import { IProductRepository } from '../../../../database/interfaces/IProductRepository';
import { FeatureFlagService } from '../../../../services/FeatureFlagService';
import { Product } from '../../../../models/Product';

describe('ProductDualWriteWrapper', () => {
  let wrapper: ProductDualWriteWrapper;
  let mysqlRepo: jest.Mocked<IProductRepository>;
  let dynamodbRepo: jest.Mocked<IProductRepository>;
  let featureFlagService: FeatureFlagService;

  const mockProduct: Product = {
    id: 1,
    seller_id: 1,
    name: 'Test Product',
    description: 'Test Description',
    price: 99.99,
    category_id: 1,
    inventory_quantity: 10,
    created_at: new Date(),
    updated_at: new Date()
  };

  beforeEach(() => {
    mysqlRepo = {
      createProduct: jest.fn(),
      updateProduct: jest.fn(),
      deleteProduct: jest.fn(),
      getProductById: jest.fn(),
      getProductWithDetails: jest.fn(),
      getProducts: jest.fn(),
      getProductsBySeller: jest.fn(),
      getProductsByCategory: jest.fn(),
      searchProducts: jest.fn(),
      updateInventory: jest.fn(),
      reduceInventory: jest.fn(),
      hasInventory: jest.fn()
    };

    dynamodbRepo = {
      createProduct: jest.fn(),
      updateProduct: jest.fn(),
      deleteProduct: jest.fn(),
      getProductById: jest.fn(),
      getProductWithDetails: jest.fn(),
      getProducts: jest.fn(),
      getProductsBySeller: jest.fn(),
      getProductsByCategory: jest.fn(),
      searchProducts: jest.fn(),
      updateInventory: jest.fn(),
      reduceInventory: jest.fn(),
      hasInventory: jest.fn()
    };

    featureFlagService = new FeatureFlagService();
    wrapper = new ProductDualWriteWrapper(mysqlRepo, dynamodbRepo, featureFlagService);
    FeatureFlagService.reset();
  });

  describe('createProduct', () => {
    it('should execute dual-write when enabled', async () => {
      FeatureFlagService.setFlag('dual_write_enabled', true);
      mysqlRepo.createProduct.mockResolvedValue(mockProduct);
      dynamodbRepo.createProduct.mockResolvedValue(mockProduct);

      const productData = { name: 'Test Product', description: 'Test', price: 99.99, category_id: 1, inventory_quantity: 10 };
      const result = await wrapper.createProduct(1, productData);

      expect(result).toBeDefined();
      expect(result.name).toBe('Test Product');
      expect(mysqlRepo.createProduct).toHaveBeenCalledTimes(1);
      expect(dynamodbRepo.createProduct).toHaveBeenCalledTimes(1);
    });

    it('should rollback on DynamoDB failure', async () => {
      FeatureFlagService.setFlag('dual_write_enabled', true);
      mysqlRepo.createProduct.mockResolvedValue(mockProduct);
      mysqlRepo.deleteProduct.mockResolvedValue(true);
      dynamodbRepo.createProduct.mockRejectedValue(new Error('DynamoDB failed'));

      const productData = { name: 'Test Product', description: 'Test', price: 99.99, category_id: 1, inventory_quantity: 10 };
      
      await expect(wrapper.createProduct(1, productData)).rejects.toThrow('DynamoDB failed');
      expect(mysqlRepo.deleteProduct).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('updateProduct', () => {
    it('should execute dual-write when enabled', async () => {
      FeatureFlagService.setFlag('dual_write_enabled', true);
      mysqlRepo.updateProduct.mockResolvedValue(mockProduct);
      dynamodbRepo.updateProduct.mockResolvedValue(mockProduct);

      const result = await wrapper.updateProduct(1, 1, { name: 'Updated Product' });

      expect(result).toBeDefined();
      expect(result?.name).toBe('Updated Product');
      expect(mysqlRepo.updateProduct).toHaveBeenCalledWith(1, 1, { name: 'Updated Product' });
      expect(dynamodbRepo.updateProduct).toHaveBeenCalledTimes(1);
    });
  });

  describe('deleteProduct', () => {
    it('should execute dual-write when enabled', async () => {
      FeatureFlagService.setFlag('dual_write_enabled', true);
      mysqlRepo.getProductById.mockResolvedValue(mockProduct);
      mysqlRepo.deleteProduct.mockResolvedValue(true);
      dynamodbRepo.deleteProduct.mockResolvedValue(true);

      const result = await wrapper.deleteProduct(1, 1);

      expect(result).toBe(true);
      expect(mysqlRepo.deleteProduct).toHaveBeenCalledWith(1, 1);
      expect(dynamodbRepo.deleteProduct).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('updateInventory', () => {
    it('should execute dual-write when enabled', async () => {
      FeatureFlagService.setFlag('dual_write_enabled', true);
      mysqlRepo.updateInventory.mockResolvedValue(true);
      dynamodbRepo.updateInventory.mockResolvedValue(true);

      const result = await wrapper.updateInventory(1, 20);

      expect(result).toBe(true);
      expect(mysqlRepo.updateInventory).toHaveBeenCalledWith(1, 20);
      expect(dynamodbRepo.updateInventory).toHaveBeenCalledWith(1, 20);
    });
  });
});
