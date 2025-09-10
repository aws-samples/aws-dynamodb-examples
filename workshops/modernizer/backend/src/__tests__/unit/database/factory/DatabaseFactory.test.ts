import { DatabaseFactory, DatabaseType } from '../../../../database/factory/DatabaseFactory';
import { MySQLUserRepository } from '../../../../database/implementations/mysql/MySQLUserRepository';
import { DynamoDBUserRepository } from '../../../../database/implementations/dynamodb/DynamoDBUserRepository';

describe('DatabaseFactory', () => {
  beforeEach(() => {
    // Reset to default state
    DatabaseFactory.initialize('mysql');
  });

  describe('initialize', () => {
    it('should initialize with mysql database type', () => {
      DatabaseFactory.initialize('mysql');
      expect(DatabaseFactory.getDatabaseType()).toBe('mysql');
    });

    it('should initialize with dynamodb database type', () => {
      DatabaseFactory.initialize('dynamodb');
      expect(DatabaseFactory.getDatabaseType()).toBe('dynamodb');
    });

    it('should throw error for invalid database type', () => {
      expect(() => {
        DatabaseFactory.initialize('invalid' as DatabaseType);
      }).toThrow('Invalid database type: invalid. Must be \'mysql\' or \'dynamodb\'');
    });
  });

  describe('createUserRepository', () => {
    it('should create MySQL user repository when type is mysql', () => {
      DatabaseFactory.initialize('mysql');
      const repository = DatabaseFactory.createUserRepository();
      expect(repository).toBeInstanceOf(MySQLUserRepository);
    });

    it('should create DynamoDB user repository when type is dynamodb', () => {
      // Set up DynamoDB environment
      process.env.DATABASE_TYPE = 'dynamodb';
      process.env.AWS_REGION = 'us-east-1';
      process.env.DYNAMODB_TABLE_PREFIX = 'test_';
      process.env.AWS_ACCESS_KEY_ID = 'test';
      process.env.AWS_SECRET_ACCESS_KEY = 'test';
      
      DatabaseFactory.initialize('dynamodb');
      const repository = DatabaseFactory.createUserRepository();
      expect(repository).toBeInstanceOf(DynamoDBUserRepository);
    });
  });

  describe('createProductRepository', () => {
    it('should create MySQL product repository when type is mysql', () => {
      DatabaseFactory.initialize('mysql');
      const repository = DatabaseFactory.createProductRepository();
      expect(repository.constructor.name).toBe('MySQLProductRepository');
    });

    it('should create DynamoDB product repository when type is dynamodb', () => {
      DatabaseFactory.initialize('dynamodb');
      const repository = DatabaseFactory.createProductRepository();
      expect(repository.constructor.name).toBe('DynamoDBProductRepository');
    });
  });

  describe('createOrderRepository', () => {
    it('should create MySQL order repository when type is mysql', () => {
      DatabaseFactory.initialize('mysql');
      const repository = DatabaseFactory.createOrderRepository();
      expect(repository.constructor.name).toBe('MySQLOrderRepository');
    });

    it('should create DynamoDB order repository when type is dynamodb', () => {
      DatabaseFactory.initialize('dynamodb');
      const repository = DatabaseFactory.createOrderRepository();
      expect(repository.constructor.name).toBe('DynamoDBOrderRepository');
    });
  });

  describe('createCategoryRepository', () => {
    it('should create MySQL category repository when type is mysql', () => {
      DatabaseFactory.initialize('mysql');
      const repository = DatabaseFactory.createCategoryRepository();
      expect(repository.constructor.name).toBe('MySQLCategoryRepository');
    });

    it('should create DynamoDB category repository when type is dynamodb', () => {
      DatabaseFactory.initialize('dynamodb');
      const repository = DatabaseFactory.createCategoryRepository();
      expect(repository.constructor.name).toBe('DynamoDBCategoryRepository');
    });
  });

  describe('createShoppingCartRepository', () => {
    it('should create MySQL shopping cart repository when type is mysql', () => {
      DatabaseFactory.initialize('mysql');
      const repository = DatabaseFactory.createShoppingCartRepository();
      expect(repository.constructor.name).toBe('MySQLShoppingCartRepository');
    });

    it('should create DynamoDB shopping cart repository when type is dynamodb', () => {
      DatabaseFactory.initialize('dynamodb');
      const repository = DatabaseFactory.createShoppingCartRepository();
      expect(repository.constructor.name).toBe('DynamoDBShoppingCartRepository');
    });
  });
});
