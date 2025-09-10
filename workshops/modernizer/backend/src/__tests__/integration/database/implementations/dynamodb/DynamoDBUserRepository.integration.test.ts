import { DynamoDBUserRepository } from '../../../../../database/implementations/dynamodb/DynamoDBUserRepository';
import { User, CreateUserRequest, UpdateUserRequest } from '../../../../../models/User';
import { isDynamoDBAvailable } from '../../../../../test-configs/integration-setup';

// This test requires DynamoDB Local to be running
describe('DynamoDBUserRepository Integration Tests', () => {
  let repository: DynamoDBUserRepository;

  beforeAll(() => {
    // Set up DynamoDB Local environment
    process.env.DATABASE_TYPE = 'dynamodb';
    process.env.AWS_REGION = 'us-east-1';
    process.env.DYNAMODB_ENDPOINT = 'http://localhost:8000';
    process.env.DYNAMODB_TABLE_PREFIX = 'test_';
    process.env.AWS_ACCESS_KEY_ID = 'test';
    process.env.AWS_SECRET_ACCESS_KEY = 'test';
  });

  beforeEach(() => {
    if (!isDynamoDBAvailable()) {
      pending('DynamoDB Local not available');
    }
    repository = new DynamoDBUserRepository('users');
  });

  describe('create and findByEmail', () => {
    it('should create user and find by email', async () => {
      const userData: CreateUserRequest & { password_hash: string } = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        password_hash: 'hashedpassword',
        first_name: 'Test',
        last_name: 'User',
      };

      const createdUser = await repository.create(userData);
      expect(createdUser.email).toBe('test@example.com');
      expect(createdUser.username).toBe('testuser');

      const foundUser = await repository.findByEmail('test@example.com');
      expect(foundUser).not.toBeNull();
      expect(foundUser?.email).toBe('test@example.com');
    });
  });

  describe('existsByEmail', () => {
    it('should return false for non-existent email', async () => {
      const exists = await repository.existsByEmail('nonexistent@example.com');
      expect(exists).toBe(false);
    });
  });
});
