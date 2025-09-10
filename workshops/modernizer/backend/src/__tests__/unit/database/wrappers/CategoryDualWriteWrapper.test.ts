import { CategoryDualWriteWrapper } from '../../../../database/wrappers/CategoryDualWriteWrapper';
import { ICategoryRepository } from '../../../../database/interfaces/ICategoryRepository';
import { FeatureFlagService } from '../../../../services/FeatureFlagService';
import { Category } from '../../../../models/Category';

describe('CategoryDualWriteWrapper', () => {
  let wrapper: CategoryDualWriteWrapper;
  let mysqlRepo: jest.Mocked<ICategoryRepository>;
  let dynamodbRepo: jest.Mocked<ICategoryRepository>;
  let featureFlagService: FeatureFlagService;

  const mockCategory: Category = {
    id: 1,
    name: 'Electronics',
    parent_id: undefined,
    created_at: new Date(),
    updated_at: new Date()
  };

  const mockParentCategory: Category = {
    id: 2,
    name: 'Parent Category',
    parent_id: undefined,
    created_at: new Date(),
    updated_at: new Date()
  };

  beforeEach(() => {
    mysqlRepo = {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findById: jest.fn(),
      findByParentId: jest.fn(),
      findAll: jest.fn(),
      findRootCategories: jest.fn(),
      findChildCategories: jest.fn(),
      existsByName: jest.fn(),
      existsById: jest.fn(),
      validateParentId: jest.fn(),
      wouldCreateCycle: jest.fn(),
      getCategoryPath: jest.fn()
    };

    dynamodbRepo = {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findById: jest.fn(),
      findByParentId: jest.fn(),
      findAll: jest.fn(),
      findRootCategories: jest.fn(),
      findChildCategories: jest.fn(),
      existsByName: jest.fn(),
      existsById: jest.fn(),
      validateParentId: jest.fn(),
      wouldCreateCycle: jest.fn(),
      getCategoryPath: jest.fn()
    };

    featureFlagService = new FeatureFlagService();
    wrapper = new CategoryDualWriteWrapper(mysqlRepo, dynamodbRepo, featureFlagService);
    FeatureFlagService.reset();
  });

  describe('create', () => {
    it('should execute dual-write when enabled', async () => {
      FeatureFlagService.setFlag('dual_write_enabled', true);
      mysqlRepo.create.mockResolvedValue(mockCategory);
      dynamodbRepo.create.mockResolvedValue(mockCategory);

      const result = await wrapper.create({ name: 'Electronics' });

      expect(result).toBeDefined();
      
      expect(mysqlRepo.create).toHaveBeenCalledTimes(1);
      expect(dynamodbRepo.create).toHaveBeenCalledTimes(1);
    });

    it('should create child category with parent', async () => {
      FeatureFlagService.setFlag('dual_write_enabled', true);
      mysqlRepo.findById.mockResolvedValue(mockParentCategory);
      const childCategory = { ...mockCategory, name: 'Child Category', parent_id: 2 };
      mysqlRepo.create.mockResolvedValue(childCategory);
      dynamodbRepo.create.mockResolvedValue(childCategory);

      const result = await wrapper.create({ name: 'Child Category', parent_id: 2 });

      expect(result).toBeDefined();
      expect(mysqlRepo.create).toHaveBeenCalledTimes(1);
      expect(dynamodbRepo.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('update', () => {
    it('should execute dual-write when enabled', async () => {
      FeatureFlagService.setFlag('dual_write_enabled', true);
      mysqlRepo.update.mockResolvedValue(mockCategory);
      dynamodbRepo.update.mockResolvedValue(mockCategory);

      const result = await wrapper.update(1, { name: 'Updated Electronics' });

      expect(result).toBeDefined();
      expect(mysqlRepo.update).toHaveBeenCalledWith(1, { name: 'Updated Electronics' });
      expect(dynamodbRepo.update).toHaveBeenCalledTimes(1);
    });
  });

  describe('delete', () => {
    it('should execute dual-write when enabled', async () => {
      FeatureFlagService.setFlag('dual_write_enabled', true);
      mysqlRepo.findById.mockResolvedValue(mockCategory);
      mysqlRepo.delete.mockResolvedValue(true);
      dynamodbRepo.delete.mockResolvedValue(true);

      const result = await wrapper.delete(1);

      expect(result).toBeDefined();
      expect(mysqlRepo.delete).toHaveBeenCalledWith(1);
      expect(dynamodbRepo.delete).toHaveBeenCalledWith(1);
    });

    it('should fail if category not found', async () => {
      mysqlRepo.findById.mockResolvedValue(null);

      const result = await wrapper.delete(1);

      await expect(wrapper.delete(1)).rejects.toThrow();
      
    });
  });
});
