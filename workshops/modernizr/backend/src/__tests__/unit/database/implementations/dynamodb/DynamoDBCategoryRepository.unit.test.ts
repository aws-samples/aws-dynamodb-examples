import { DynamoDBCategoryRepository } from '../../../../../database/implementations/dynamodb/DynamoDBCategoryRepository';

// Mock the DynamoDB client
const mockSend = jest.fn();
const mockClient = {
  send: mockSend,
};

// Mock the DynamoDBClientManager
jest.mock('../../../../../database/config/DynamoDBClient', () => ({
  DynamoDBClientManager: {
    getClient: () => mockClient,
    getTableName: (tableName: string) => `test_${tableName}`,
  },
}));

describe('DynamoDBCategoryRepository Unit Tests', () => {
  let repository: DynamoDBCategoryRepository;

  beforeEach(() => {
    repository = new DynamoDBCategoryRepository('categories');
    mockSend.mockClear();
  });

  describe('findById', () => {
    it('should return category when found', async () => {
      const mockCategory = {
        PK: 'CATEGORY#1',
        SK: '#META',
        id: 1,
        name: 'Electronics',
        parent_id: null,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z'
      };

      mockSend.mockResolvedValue({ Item: mockCategory });

      const result = await repository.findById(1);

      expect(result).toEqual({
        id: 1,
        name: 'Electronics',
        parent_id: null,
        created_at: new Date('2024-01-01T00:00:00.000Z'),
        updated_at: new Date('2024-01-01T00:00:00.000Z')
      });
    });

    it('should return null when category not found', async () => {
      mockSend.mockResolvedValue({});

      const result = await repository.findById(999);

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create category with generated ID', async () => {
      mockSend.mockResolvedValue({});

      const result = await repository.create({
        name: 'New Category',
        parent_id: 1
      });

      expect(result.name).toBe('New Category');
      expect(result.parent_id).toBe(1);
      expect(result.id).toBeDefined();
      expect(mockSend).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all categories', async () => {
      const mockCategories = [
        {
          PK: 'CATEGORY#1',
          SK: '#META',
          id: 1,
          name: 'Electronics',
          parent_id: null,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z'
        }
      ];

      mockSend.mockResolvedValue({ Items: mockCategories });

      const result = await repository.findAll();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Electronics');
    });
  });

  describe('findByParentId', () => {
    it('should return categories by parent ID', async () => {
      const mockCategories = [
        {
          PK: 'CATEGORY#2',
          SK: '#META',
          id: 2,
          name: 'Smartphones',
          parent_id: 1,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z'
        }
      ];

      mockSend.mockResolvedValue({ Items: mockCategories });

      const result = await repository.findByParentId(1);

      expect(result).toHaveLength(1);
      expect(result[0].parent_id).toBe(1);
    });
  });

  describe('update', () => {
    it('should update existing category', async () => {
      const mockUpdatedCategory = {
        PK: 'CATEGORY#1',
        SK: '#META',
        id: 1,
        name: 'Updated Electronics',
        parent_id: null,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z'
      };

      mockSend.mockResolvedValue({ Attributes: mockUpdatedCategory });

      const result = await repository.update(1, { name: 'Updated Electronics' });

      expect(result?.name).toBe('Updated Electronics');
    });
  });

  describe('delete', () => {
    it('should delete category', async () => {
      mockSend.mockResolvedValue({});

      const result = await repository.delete(1);

      expect(result).toBe(true);
      expect(mockSend).toHaveBeenCalled();
    });
  });

  describe('existsByName', () => {
    it('should return true when name exists', async () => {
      mockSend.mockResolvedValue({ Items: [{ id: 1 }] });

      const result = await repository.existsByName('Electronics');

      expect(result).toBe(true);
    });

    it('should return false when name does not exist', async () => {
      mockSend.mockResolvedValue({ Items: [] });

      const result = await repository.existsByName('NonExistent');

      expect(result).toBe(false);
    });
  });
});
