import { CategoryRepository } from '../../../repositories/CategoryRepository';
import { pool } from '../../../config/database';
import { CreateCategoryRequest, UpdateCategoryRequest } from '../../../models/Category';

// Mock the database pool
jest.mock('../../../config/database', () => ({
  pool: {
    execute: jest.fn(),
  },
}));

const mockPool = pool as jest.Mocked<typeof pool>;

describe('CategoryRepository', () => {
  let categoryRepository: CategoryRepository;

  beforeEach(() => {
    categoryRepository = new CategoryRepository();
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all categories', async () => {
      const mockCategories = [
        {
          id: 1,
          name: 'Electronics',
          parent_id: null,
          created_at: new Date(),
        },
        {
          id: 2,
          name: 'Laptops',
          parent_id: 1,
          created_at: new Date(),
        },
      ];

      mockPool.execute.mockResolvedValueOnce([mockCategories as any, []]);

      const result = await categoryRepository.findAll();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 1,
        name: 'Electronics',
        parent_id: undefined,
        created_at: mockCategories[0].created_at,
      });
      expect(result[1]).toEqual({
        id: 2,
        name: 'Laptops',
        parent_id: 1,
        created_at: mockCategories[1].created_at,
      });
    });

    it('should return empty array when no categories exist', async () => {
      mockPool.execute.mockResolvedValueOnce([[], []]);

      const result = await categoryRepository.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findById', () => {
    it('should return category when found', async () => {
      const mockCategory = {
        id: 1,
        name: 'Electronics',
        parent_id: null,
        created_at: new Date(),
      };

      mockPool.execute.mockResolvedValueOnce([[mockCategory] as any, []]);

      const result = await categoryRepository.findById(1);

      expect(result).toEqual({
        id: 1,
        name: 'Electronics',
        parent_id: undefined,
        created_at: mockCategory.created_at,
      });
    });

    it('should return null when category not found', async () => {
      mockPool.execute.mockResolvedValueOnce([[], []]);

      const result = await categoryRepository.findById(999);

      expect(result).toBeNull();
    });
  });

  describe('findByParentId', () => {
    it('should return root categories when parentId is null', async () => {
      const mockCategories = [
        {
          id: 1,
          name: 'Electronics',
          parent_id: null,
          created_at: new Date(),
        },
      ];

      mockPool.execute.mockResolvedValueOnce([mockCategories as any, []]);

      const result = await categoryRepository.findByParentId(null);

      expect(result).toHaveLength(1);
      expect(result[0].parent_id).toBeUndefined();
    });

    it('should return child categories when parentId is provided', async () => {
      const mockCategories = [
        {
          id: 2,
          name: 'Laptops',
          parent_id: 1,
          created_at: new Date(),
        },
      ];

      mockPool.execute.mockResolvedValueOnce([mockCategories as any, []]);

      const result = await categoryRepository.findByParentId(1);

      expect(result).toHaveLength(1);
      expect(result[0].parent_id).toBe(1);
    });
  });

  describe('create', () => {
    it('should create category successfully', async () => {
      const categoryData: CreateCategoryRequest = {
        name: 'Electronics',
        parent_id: undefined,
      };

      const mockResult = { insertId: 1 };
      const mockCreatedCategory = {
        id: 1,
        name: 'Electronics',
        parent_id: null,
        created_at: new Date(),
      };

      mockPool.execute
        .mockResolvedValueOnce([mockResult as any, []]) // INSERT query
        .mockResolvedValueOnce([[mockCreatedCategory] as any, []]); // SELECT query

      const result = await categoryRepository.create(categoryData);

      expect(result).toEqual({
        id: 1,
        name: 'Electronics',
        parent_id: undefined,
        created_at: mockCreatedCategory.created_at,
      });
    });

    it('should create category with parent_id', async () => {
      const categoryData: CreateCategoryRequest = {
        name: 'Laptops',
        parent_id: 1,
      };

      const mockResult = { insertId: 2 };
      const mockCreatedCategory = {
        id: 2,
        name: 'Laptops',
        parent_id: 1,
        created_at: new Date(),
      };

      mockPool.execute
        .mockResolvedValueOnce([mockResult as any, []])
        .mockResolvedValueOnce([[mockCreatedCategory] as any, []]);

      const result = await categoryRepository.create(categoryData);

      expect(result.parent_id).toBe(1);
    });
  });

  describe('update', () => {
    it('should update category name', async () => {
      const updateData: UpdateCategoryRequest = {
        name: 'Updated Electronics',
      };

      const mockUpdatedCategory = {
        id: 1,
        name: 'Updated Electronics',
        parent_id: null,
        created_at: new Date(),
      };

      mockPool.execute
        .mockResolvedValueOnce([{ affectedRows: 1 } as any, []]) // UPDATE query
        .mockResolvedValueOnce([[mockUpdatedCategory] as any, []]); // SELECT query

      const result = await categoryRepository.update(1, updateData);

      expect(result).toEqual({
        id: 1,
        name: 'Updated Electronics',
        parent_id: undefined,
        created_at: mockUpdatedCategory.created_at,
      });
    });

    it('should return existing category when no fields to update', async () => {
      const mockCategory = {
        id: 1,
        name: 'Electronics',
        parent_id: null,
        created_at: new Date(),
      };

      mockPool.execute.mockResolvedValueOnce([[mockCategory] as any, []]);

      const result = await categoryRepository.update(1, {});

      expect(result).toEqual({
        id: 1,
        name: 'Electronics',
        parent_id: undefined,
        created_at: mockCategory.created_at,
      });
    });

    it('should return null when category not found', async () => {
      const updateData: UpdateCategoryRequest = {
        name: 'Updated Name',
      };

      mockPool.execute.mockResolvedValueOnce([{ affectedRows: 0 } as any, []]);

      const result = await categoryRepository.update(999, updateData);

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete category successfully', async () => {
      mockPool.execute
        .mockResolvedValueOnce([[], []]) // Check for children
        .mockResolvedValueOnce([{ affectedRows: 1 } as any, []]); // DELETE query

      const result = await categoryRepository.delete(1);

      expect(result).toBe(true);
    });

    it('should throw error when category has children', async () => {
      const mockChildren = [
        {
          id: 2,
          name: 'Laptops',
          parent_id: 1,
          created_at: new Date(),
        },
      ];

      mockPool.execute.mockResolvedValueOnce([mockChildren as any, []]);

      await expect(categoryRepository.delete(1)).rejects.toThrow(
        'Cannot delete category with child categories'
      );
    });

    it('should return false when category not found', async () => {
      mockPool.execute
        .mockResolvedValueOnce([[], []]) // No children
        .mockResolvedValueOnce([{ affectedRows: 0 } as any, []]); // DELETE query

      const result = await categoryRepository.delete(999);

      expect(result).toBe(false);
    });
  });

  describe('existsByName', () => {
    it('should return true when name exists', async () => {
      mockPool.execute.mockResolvedValueOnce([[{ count: 1 }] as any, []]);

      const result = await categoryRepository.existsByName('Electronics');

      expect(result).toBe(true);
    });

    it('should return false when name does not exist', async () => {
      mockPool.execute.mockResolvedValueOnce([[{ count: 0 }] as any, []]);

      const result = await categoryRepository.existsByName('NonExistent');

      expect(result).toBe(false);
    });

    it('should exclude specific ID when checking name existence', async () => {
      mockPool.execute.mockResolvedValueOnce([[{ count: 0 }] as any, []]);

      const result = await categoryRepository.existsByName('Electronics', 1);

      expect(result).toBe(false);
    });
  });

  describe('existsById', () => {
    it('should return true when category exists', async () => {
      mockPool.execute.mockResolvedValueOnce([[{ count: 1 }] as any, []]);

      const result = await categoryRepository.existsById(1);

      expect(result).toBe(true);
    });

    it('should return false when category does not exist', async () => {
      mockPool.execute.mockResolvedValueOnce([[{ count: 0 }] as any, []]);

      const result = await categoryRepository.existsById(999);

      expect(result).toBe(false);
    });
  });

  describe('wouldCreateCycle', () => {
    it('should return true when category would be its own parent', async () => {
      const result = await categoryRepository.wouldCreateCycle(1, 1);

      expect(result).toBe(true);
    });

    it('should return false when no cycle would be created', async () => {
      mockPool.execute.mockResolvedValueOnce([[], []]);

      const result = await categoryRepository.wouldCreateCycle(1, 3);

      expect(result).toBe(false);
    });
  });

  describe('getCategoryPath', () => {
    it('should return path from root to category', async () => {
      const mockRootCategory = {
        id: 1,
        name: 'Electronics',
        parent_id: null,
        created_at: new Date(),
      };

      const mockChildCategory = {
        id: 2,
        name: 'Laptops',
        parent_id: 1,
        created_at: new Date(),
      };

      mockPool.execute
        .mockResolvedValueOnce([[mockChildCategory] as any, []]) // Child category
        .mockResolvedValueOnce([[mockRootCategory] as any, []]); // Root category

      const result = await categoryRepository.getCategoryPath(2);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Electronics');
      expect(result[1].name).toBe('Laptops');
    });

    it('should return single category for root category', async () => {
      const mockRootCategory = {
        id: 1,
        name: 'Electronics',
        parent_id: null,
        created_at: new Date(),
      };

      mockPool.execute.mockResolvedValueOnce([[mockRootCategory] as any, []]);

      const result = await categoryRepository.getCategoryPath(1);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Electronics');
    });
  });
});