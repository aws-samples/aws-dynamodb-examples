import { CategoryService } from '../../../services/CategoryService';
import { CategoryRepository } from '../../../repositories/CategoryRepository';
import { Category, CreateCategoryRequest, UpdateCategoryRequest } from '../../../models/Category';

// Mock the CategoryRepository
jest.mock('../../../repositories/CategoryRepository');

const mockCategoryRepository = CategoryRepository as jest.MockedClass<typeof CategoryRepository>;

describe('CategoryService', () => {
  let categoryService: CategoryService;
  let mockCategoryRepositoryInstance: jest.Mocked<CategoryRepository>;

  beforeEach(() => {
    mockCategoryRepositoryInstance = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByParentId: jest.fn(),
      findRootCategories: jest.fn(),
      findChildCategories: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      existsByName: jest.fn(),
      existsById: jest.fn(),
      validateParentId: jest.fn(),
      wouldCreateCycle: jest.fn(),
      getCategoryPath: jest.fn(),
    } as any;

    mockCategoryRepository.mockImplementation(() => mockCategoryRepositoryInstance);
    categoryService = new CategoryService();
    jest.clearAllMocks();
  });

  describe('getAllCategories', () => {
    it('should return all categories', async () => {
      const mockCategories: Category[] = [
        {
          id: 1,
          name: 'Electronics',
          parent_id: undefined,
          created_at: new Date(),
        },
      ];

      mockCategoryRepositoryInstance.findAll.mockResolvedValueOnce(mockCategories);

      const result = await categoryService.getAllCategories();

      expect(result).toEqual(mockCategories);
      expect(mockCategoryRepositoryInstance.findAll).toHaveBeenCalled();
    });
  });

  describe('getCategoryTree', () => {
    it('should return hierarchical category tree', async () => {
      const mockCategories: Category[] = [
        {
          id: 1,
          name: 'Electronics',
          parent_id: undefined,
          created_at: new Date(),
        },
        {
          id: 2,
          name: 'Laptops',
          parent_id: 1,
          created_at: new Date(),
        },
      ];

      mockCategoryRepositoryInstance.findAll.mockResolvedValueOnce(mockCategories);

      const result = await categoryService.getCategoryTree();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Electronics');
      expect(result[0].children).toHaveLength(1);
      expect(result[0].children![0].name).toBe('Laptops');
    });
  });

  describe('getCategoryById', () => {
    it('should return category when found', async () => {
      const mockCategory: Category = {
        id: 1,
        name: 'Electronics',
        parent_id: undefined,
        created_at: new Date(),
      };

      mockCategoryRepositoryInstance.findById.mockResolvedValueOnce(mockCategory);

      const result = await categoryService.getCategoryById(1);

      expect(result).toEqual(mockCategory);
      expect(mockCategoryRepositoryInstance.findById).toHaveBeenCalledWith(1);
    });

    it('should return null when category not found', async () => {
      mockCategoryRepositoryInstance.findById.mockResolvedValueOnce(null);

      const result = await categoryService.getCategoryById(999);

      expect(result).toBeNull();
    });
  });

  describe('getChildCategories', () => {
    it('should return child categories when parent exists', async () => {
      const mockChildren: Category[] = [
        {
          id: 2,
          name: 'Laptops',
          parent_id: 1,
          created_at: new Date(),
        },
      ];

      mockCategoryRepositoryInstance.existsById.mockResolvedValueOnce(true);
      mockCategoryRepositoryInstance.findChildCategories.mockResolvedValueOnce(mockChildren);

      const result = await categoryService.getChildCategories(1);

      expect(result).toEqual(mockChildren);
      expect(mockCategoryRepositoryInstance.existsById).toHaveBeenCalledWith(1);
      expect(mockCategoryRepositoryInstance.findChildCategories).toHaveBeenCalledWith(1);
    });

    it('should throw error when parent category not found', async () => {
      mockCategoryRepositoryInstance.existsById.mockResolvedValueOnce(false);

      await expect(categoryService.getChildCategories(999)).rejects.toThrow(
        'Parent category not found'
      );
    });
  });

  describe('createCategory', () => {
    it('should create category successfully', async () => {
      const categoryData: CreateCategoryRequest = {
        name: 'Electronics',
        parent_id: undefined,
      };

      const mockCreatedCategory: Category = {
        id: 1,
        name: 'Electronics',
        parent_id: undefined,
        created_at: new Date(),
      };

      mockCategoryRepositoryInstance.existsByName.mockResolvedValueOnce(false);
      mockCategoryRepositoryInstance.create.mockResolvedValueOnce(mockCreatedCategory);

      const result = await categoryService.createCategory(categoryData);

      expect(result).toEqual(mockCreatedCategory);
      expect(mockCategoryRepositoryInstance.existsByName).toHaveBeenCalledWith('Electronics', undefined);
      expect(mockCategoryRepositoryInstance.create).toHaveBeenCalledWith({
        name: 'Electronics',
        parent_id: undefined,
      });
    });

    it('should throw error when name is empty', async () => {
      const categoryData: CreateCategoryRequest = {
        name: '',
        parent_id: undefined,
      };

      await expect(categoryService.createCategory(categoryData)).rejects.toThrow(
        'Category name is required'
      );
    });

    it('should throw error when name is too long', async () => {
      const categoryData: CreateCategoryRequest = {
        name: 'a'.repeat(101),
        parent_id: undefined,
      };

      await expect(categoryService.createCategory(categoryData)).rejects.toThrow(
        'Category name must be 100 characters or less'
      );
    });

    it('should throw error when name already exists', async () => {
      const categoryData: CreateCategoryRequest = {
        name: 'Electronics',
        parent_id: undefined,
      };

      mockCategoryRepositoryInstance.existsByName.mockResolvedValueOnce(true);

      await expect(categoryService.createCategory(categoryData)).rejects.toThrow(
        'Category name already exists'
      );
    });

    it('should throw error when parent category not found', async () => {
      const categoryData: CreateCategoryRequest = {
        name: 'Laptops',
        parent_id: 999,
      };

      mockCategoryRepositoryInstance.existsByName.mockResolvedValueOnce(false);
      mockCategoryRepositoryInstance.validateParentId.mockResolvedValueOnce(false);

      await expect(categoryService.createCategory(categoryData)).rejects.toThrow(
        'Parent category not found'
      );
    });

    it('should throw error when trying to create more than 2 levels', async () => {
      const categoryData: CreateCategoryRequest = {
        name: 'Gaming Laptops',
        parent_id: 2,
      };

      const mockParentCategory: Category = {
        id: 2,
        name: 'Laptops',
        parent_id: 1, // This already has a parent, so adding child would create 3 levels
        created_at: new Date(),
      };

      mockCategoryRepositoryInstance.existsByName.mockResolvedValueOnce(false);
      mockCategoryRepositoryInstance.validateParentId.mockResolvedValueOnce(true);
      mockCategoryRepositoryInstance.findById.mockResolvedValueOnce(mockParentCategory);

      await expect(categoryService.createCategory(categoryData)).rejects.toThrow(
        'Cannot create more than two levels of categories'
      );
    });
  });

  describe('updateCategory', () => {
    it('should update category successfully', async () => {
      const updateData: UpdateCategoryRequest = {
        name: 'Updated Electronics',
      };

      const mockExistingCategory: Category = {
        id: 1,
        name: 'Electronics',
        parent_id: undefined,
        created_at: new Date(),
      };

      const mockUpdatedCategory: Category = {
        id: 1,
        name: 'Updated Electronics',
        parent_id: undefined,
        created_at: new Date(),
      };

      mockCategoryRepositoryInstance.findById.mockResolvedValueOnce(mockExistingCategory);
      mockCategoryRepositoryInstance.existsByName.mockResolvedValueOnce(false);
      mockCategoryRepositoryInstance.update.mockResolvedValueOnce(mockUpdatedCategory);

      const result = await categoryService.updateCategory(1, updateData);

      expect(result).toEqual(mockUpdatedCategory);
      expect(mockCategoryRepositoryInstance.existsByName).toHaveBeenCalledWith('Updated Electronics', 1);
    });

    it('should throw error when category not found', async () => {
      mockCategoryRepositoryInstance.findById.mockResolvedValueOnce(null);

      await expect(categoryService.updateCategory(999, { name: 'Updated' })).rejects.toThrow(
        'Category not found'
      );
    });

    it('should throw error when updated name already exists', async () => {
      const updateData: UpdateCategoryRequest = {
        name: 'Existing Name',
      };

      const mockExistingCategory: Category = {
        id: 1,
        name: 'Electronics',
        parent_id: undefined,
        created_at: new Date(),
      };

      mockCategoryRepositoryInstance.findById.mockResolvedValueOnce(mockExistingCategory);
      mockCategoryRepositoryInstance.existsByName.mockResolvedValueOnce(true);

      await expect(categoryService.updateCategory(1, updateData)).rejects.toThrow(
        'Category name already exists'
      );
    });

    it('should throw error when trying to create circular relationship', async () => {
      const updateData: UpdateCategoryRequest = {
        parent_id: 2,
      };

      const mockExistingCategory: Category = {
        id: 1,
        name: 'Electronics',
        parent_id: undefined,
        created_at: new Date(),
      };

      mockCategoryRepositoryInstance.findById.mockResolvedValueOnce(mockExistingCategory);
      mockCategoryRepositoryInstance.validateParentId.mockResolvedValueOnce(true);
      mockCategoryRepositoryInstance.wouldCreateCycle.mockResolvedValueOnce(true);

      await expect(categoryService.updateCategory(1, updateData)).rejects.toThrow(
        'Cannot create circular category relationship'
      );
    });

    it('should throw error when category with children tries to become subcategory', async () => {
      const updateData: UpdateCategoryRequest = {
        parent_id: 3,
      };

      const mockExistingCategory: Category = {
        id: 1,
        name: 'Electronics',
        parent_id: undefined,
        created_at: new Date(),
      };

      const mockParentCategory: Category = {
        id: 3,
        name: 'Garden',
        parent_id: undefined,
        created_at: new Date(),
      };

      const mockChildren: Category[] = [
        {
          id: 2,
          name: 'Laptops',
          parent_id: 1,
          created_at: new Date(),
        },
      ];

      mockCategoryRepositoryInstance.findById
        .mockResolvedValueOnce(mockExistingCategory)
        .mockResolvedValueOnce(mockParentCategory);
      mockCategoryRepositoryInstance.validateParentId.mockResolvedValueOnce(true);
      mockCategoryRepositoryInstance.wouldCreateCycle.mockResolvedValueOnce(false);
      mockCategoryRepositoryInstance.findChildCategories.mockResolvedValueOnce(mockChildren);

      await expect(categoryService.updateCategory(1, updateData)).rejects.toThrow(
        'Category with children cannot become a subcategory'
      );
    });
  });

  describe('deleteCategory', () => {
    it('should delete category successfully', async () => {
      const mockCategory: Category = {
        id: 1,
        name: 'Electronics',
        parent_id: undefined,
        created_at: new Date(),
      };

      mockCategoryRepositoryInstance.findById.mockResolvedValueOnce(mockCategory);
      mockCategoryRepositoryInstance.delete.mockResolvedValueOnce(true);

      const result = await categoryService.deleteCategory(1);

      expect(result).toBe(true);
      expect(mockCategoryRepositoryInstance.delete).toHaveBeenCalledWith(1);
    });

    it('should throw error when category not found', async () => {
      mockCategoryRepositoryInstance.findById.mockResolvedValueOnce(null);

      await expect(categoryService.deleteCategory(999)).rejects.toThrow(
        'Category not found'
      );
    });
  });

  describe('getCategoryPath', () => {
    it('should return category path', async () => {
      const mockCategory: Category = {
        id: 2,
        name: 'Laptops',
        parent_id: 1,
        created_at: new Date(),
      };

      const mockPath: Category[] = [
        {
          id: 1,
          name: 'Electronics',
          parent_id: undefined,
          created_at: new Date(),
        },
        mockCategory,
      ];

      mockCategoryRepositoryInstance.findById.mockResolvedValueOnce(mockCategory);
      mockCategoryRepositoryInstance.getCategoryPath.mockResolvedValueOnce(mockPath);

      const result = await categoryService.getCategoryPath(2);

      expect(result).toEqual(mockPath);
    });

    it('should throw error when category not found', async () => {
      mockCategoryRepositoryInstance.findById.mockResolvedValueOnce(null);

      await expect(categoryService.getCategoryPath(999)).rejects.toThrow(
        'Category not found'
      );
    });
  });

  describe('searchCategories', () => {
    it('should return matching categories', async () => {
      const mockCategories: Category[] = [
        {
          id: 1,
          name: 'Electronics',
          parent_id: undefined,
          created_at: new Date(),
        },
        {
          id: 2,
          name: 'Electronic Tools',
          parent_id: undefined,
          created_at: new Date(),
        },
        {
          id: 3,
          name: 'Garden',
          parent_id: undefined,
          created_at: new Date(),
        },
      ];

      mockCategoryRepositoryInstance.findAll.mockResolvedValueOnce(mockCategories);

      const result = await categoryService.searchCategories('electronic');

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Electronics');
      expect(result[1].name).toBe('Electronic Tools');
    });

    it('should return empty array for empty search term', async () => {
      const result = await categoryService.searchCategories('');

      expect(result).toEqual([]);
      expect(mockCategoryRepositoryInstance.findAll).not.toHaveBeenCalled();
    });
  });

  describe('getCategorySubtreeIds', () => {
    it('should return subtree IDs', async () => {
      const mockCategory: Category = {
        id: 1,
        name: 'Electronics',
        parent_id: undefined,
        created_at: new Date(),
      };

      const mockCategories: Category[] = [
        mockCategory,
        {
          id: 2,
          name: 'Laptops',
          parent_id: 1,
          created_at: new Date(),
        },
      ];

      mockCategoryRepositoryInstance.findById.mockResolvedValueOnce(mockCategory);
      mockCategoryRepositoryInstance.findAll.mockResolvedValueOnce(mockCategories);

      const result = await categoryService.getCategorySubtreeIds(1);

      expect(result.sort()).toEqual([1, 2]);
    });

    it('should throw error when category not found', async () => {
      mockCategoryRepositoryInstance.findById.mockResolvedValueOnce(null);

      await expect(categoryService.getCategorySubtreeIds(999)).rejects.toThrow(
        'Category not found'
      );
    });
  });
});