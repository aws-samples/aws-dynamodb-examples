import { DynamoDBUserRepository } from '../../../../../database/implementations/dynamodb/DynamoDBUserRepository';

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

describe('DynamoDBUserRepository Unit Tests', () => {
  let repository: DynamoDBUserRepository;

  beforeEach(() => {
    repository = new DynamoDBUserRepository('users');
    mockSend.mockClear();
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      const mockUser = {
        GSI1PK: '1',
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        profile_data: { first_name: 'Test', last_name: 'User' },
        is_seller: false,
        super_admin: false,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z'
      };

      mockSend.mockResolvedValue({ Items: [mockUser] });

      const result = await repository.findById(1);

      expect(result).toEqual({
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        first_name: 'Test',
        last_name: 'User',
        is_seller: false,
        created_at: new Date('2024-01-01T00:00:00.000Z'),
        updated_at: new Date('2024-01-01T00:00:00.000Z')
      });
    });

    it('should return null when user not found', async () => {
      mockSend.mockResolvedValue({ Items: [] });

      const result = await repository.findById(999);

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create user with generated ID', async () => {
      mockSend.mockResolvedValue({});

      const result = await repository.create({
        username: 'newuser',
        email: 'new@example.com',
        password: 'plainpassword',
        password_hash: 'hashedpassword',
        first_name: 'New',
        last_name: 'User'
      });

      expect(result.username).toBe('newuser');
      expect(result.email).toBe('new@example.com');
      expect(result.id).toBeDefined();
      expect(mockSend).toHaveBeenCalled();
    });
  });

  describe('findByEmail', () => {
    it('should return user when found by email', async () => {
      const mockUser = {
        GSI1PK: '1',
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        profile_data: { first_name: 'Test', last_name: 'User' },
        is_seller: false,
        super_admin: false,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z'
      };

      mockSend.mockResolvedValue({ Item: mockUser });

      const result = await repository.findByEmail('test@example.com');

      expect(result?.email).toBe('test@example.com');
    });
  });

  describe('existsByUsername', () => {
    it('should return true when username exists', async () => {
      mockSend.mockResolvedValue({ Items: [{ username: 'testuser' }] });

      const result = await repository.existsByUsername('testuser');

      expect(result).toBe(true);
    });

    it('should return false when username does not exist', async () => {
      mockSend.mockResolvedValue({ Items: [] });

      const result = await repository.existsByUsername('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('upgradeToSeller', () => {
    it('should upgrade user to seller', async () => {
      const mockUser = {
        GSI1PK: '1',
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        profile_data: { first_name: 'Test', last_name: 'User' },
        is_seller: true,
        super_admin: false,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z'
      };

      mockSend.mockResolvedValueOnce({ Items: [mockUser] }); // findById
      mockSend.mockResolvedValueOnce({ Attributes: mockUser }); // updateItem

      const result = await repository.upgradeToSeller(1);

      expect(result?.is_seller).toBe(true);
    });
  });
});
