import { MySQLCategoryRepository } from '../../../../../database/implementations/mysql/MySQLCategoryRepository';
import { CategoryRepository } from '../../../../../repositories/CategoryRepository';
import { Category, CreateCategoryRequest, UpdateCategoryRequest } from '../../../../../models/Category';

jest.mock('../../../../../repositories/CategoryRepository');

describe('MySQLCategoryRepository', () => {
  let mysqlCategoryRepository: MySQLCategoryRepository;
  let mockCategoryRepository: jest.Mocked<CategoryRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCategoryRepository = new CategoryRepository() as jest.Mocked<CategoryRepository>;
    mysqlCategoryRepository = new MySQLCategoryRepository();
    (mysqlCategoryRepository as any).categoryRepository = mockCategoryRepository;
  });

  describe('findAll', () => {
    it('should delegate to CategoryRepository.findAll', async () => {
      const mockCategories: Category[] = [
        { id: 1, name: 'Electronics', created_at: new Date() }
      ];

      mockCategoryRepository.findAll.mockResolvedValueOnce(mockCategories);

      const result = await mysqlCategoryRepository.findAll();

      expect(result).toEqual(mockCategories);
      expect(mockCategoryRepository.findAll).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should delegate to CategoryRepository.findById', async () => {
      const categoryId = 1;
      const mockCategory: Category = { 
        id: categoryId, name: 'Electronics', created_at: new Date() 
      };

      mockCategoryRepository.findById.mockResolvedValueOnce(mockCategory);

      const result = await mysqlCategoryRepository.findById(categoryId);

      expect(result).toEqual(mockCategory);
      expect(mockCategoryRepository.findById).toHaveBeenCalledWith(categoryId);
    });
  });

  describe('create', () => {
    it('should delegate to CategoryRepository.create', async () => {
      const categoryData: CreateCategoryRequest = { name: 'Electronics' };
      const mockCategory: Category = { 
        id: 1, name: 'Electronics', created_at: new Date() 
      };

      mockCategoryRepository.create.mockResolvedValueOnce(mockCategory);

      const result = await mysqlCategoryRepository.create(categoryData);

      expect(result).toEqual(mockCategory);
      expect(mockCategoryRepository.create).toHaveBeenCalledWith(categoryData);
    });
  });

  describe('update', () => {
    it('should delegate to CategoryRepository.update', async () => {
      const categoryId = 1;
      const updateData: UpdateCategoryRequest = { name: 'Updated Electronics' };
      const mockCategory: Category = { 
        id: categoryId, name: 'Updated Electronics', created_at: new Date() 
      };

      mockCategoryRepository.update.mockResolvedValueOnce(mockCategory);

      const result = await mysqlCategoryRepository.update(categoryId, updateData);

      expect(result).toEqual(mockCategory);
      expect(mockCategoryRepository.update).toHaveBeenCalledWith(categoryId, updateData);
    });
  });

  describe('delete', () => {
    it('should delegate to CategoryRepository.delete', async () => {
      const categoryId = 1;

      mockCategoryRepository.delete.mockResolvedValueOnce(true);

      const result = await mysqlCategoryRepository.delete(categoryId);

      expect(result).toBe(true);
      expect(mockCategoryRepository.delete).toHaveBeenCalledWith(categoryId);
    });
  });

  describe('existsByName', () => {
    it('should delegate to CategoryRepository.existsByName', async () => {
      const categoryName = 'Electronics';

      mockCategoryRepository.existsByName.mockResolvedValueOnce(true);

      const result = await mysqlCategoryRepository.existsByName(categoryName);

      expect(result).toBe(true);
      expect(mockCategoryRepository.existsByName).toHaveBeenCalledWith(categoryName, undefined);
    });
  });

  describe('findByParentId', () => {
    it('should delegate to CategoryRepository.findByParentId', async () => {
      const parentId = 1;
      const mockCategories: Category[] = [
        { id: 2, name: 'Smartphones', parent_id: parentId, created_at: new Date() }
      ];

      mockCategoryRepository.findByParentId.mockResolvedValueOnce(mockCategories);

      const result = await mysqlCategoryRepository.findByParentId(parentId);

      expect(result).toEqual(mockCategories);
      expect(mockCategoryRepository.findByParentId).toHaveBeenCalledWith(parentId);
    });
  });

  describe('findRootCategories', () => {
    it('should delegate to CategoryRepository.findRootCategories', async () => {
      const mockCategories: Category[] = [
        { id: 1, name: 'Electronics', created_at: new Date() }
      ];

      mockCategoryRepository.findRootCategories.mockResolvedValueOnce(mockCategories);

      const result = await mysqlCategoryRepository.findRootCategories();

      expect(result).toEqual(mockCategories);
      expect(mockCategoryRepository.findRootCategories).toHaveBeenCalled();
    });
  });
});
