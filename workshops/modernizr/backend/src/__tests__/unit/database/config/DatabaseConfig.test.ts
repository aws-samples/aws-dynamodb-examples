import { DatabaseConfigManager } from '../../../../database/config/DatabaseConfig';

describe('DatabaseConfigManager', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('initialize', () => {
    it('should initialize with default mysql configuration', () => {
      const config = DatabaseConfigManager.initialize();
      expect(config.type).toBe('mysql');
      expect(config.mysql).toBeDefined();
      expect(config.mysql?.host).toBe('localhost'); // From test environment
      expect(config.mysql?.database).toBe('test_unit_db'); // From test environment
    });

    it('should initialize with mysql configuration from environment', () => {
      process.env.DATABASE_TYPE = 'mysql';
      process.env.DB_HOST = 'localhost';
      process.env.DB_NAME = 'test_db';
      process.env.DB_PORT = '3307';

      const config = DatabaseConfigManager.initialize();
      expect(config.type).toBe('mysql');
      expect(config.mysql?.host).toBe('localhost');
      expect(config.mysql?.database).toBe('test_db');
      expect(config.mysql?.port).toBe(3307);
    });

    it('should initialize with dynamodb configuration', () => {
      process.env.DATABASE_TYPE = 'dynamodb';
      process.env.AWS_REGION = 'us-west-2';
      process.env.DYNAMODB_TABLE_PREFIX = 'test_table_';

      const config = DatabaseConfigManager.initialize();
      expect(config.type).toBe('dynamodb');
      expect(config.dynamodb).toBeDefined();
      expect(config.dynamodb?.region).toBe('us-west-2');
      expect(config.dynamodb?.tablePrefix).toBe('test_table_');
    });

    it('should throw error for invalid database type', () => {
      process.env.DATABASE_TYPE = 'invalid';
      
      expect(() => {
        DatabaseConfigManager.initialize();
      }).toThrow('Invalid DATABASE_TYPE: invalid. Must be \'mysql\' or \'dynamodb\'');
    });

    it('should throw error for incomplete mysql configuration', () => {
      process.env.DATABASE_TYPE = 'mysql';
      process.env.DB_HOST = '';
      process.env.DB_NAME = '';

      expect(() => {
        DatabaseConfigManager.initialize();
      }).toThrow('MySQL configuration incomplete: DB_HOST and DB_NAME are required');
    });

    it('should throw error for incomplete dynamodb configuration', () => {
      process.env.DATABASE_TYPE = 'dynamodb';
      process.env.AWS_REGION = '';
      process.env.DYNAMODB_TABLE_PREFIX = '';

      expect(() => {
        DatabaseConfigManager.initialize();
      }).toThrow('DynamoDB configuration incomplete: AWS_REGION and DYNAMODB_TABLE_PREFIX are required');
    });
  });

  describe('getConfig', () => {
    it('should return existing config if already initialized', () => {
      const config1 = DatabaseConfigManager.initialize();
      const config2 = DatabaseConfigManager.getConfig();
      expect(config1).toBe(config2);
    });

    it('should initialize config if not already initialized', () => {
      const config = DatabaseConfigManager.getConfig();
      expect(config).toBeDefined();
      expect(config.type).toBe('mysql');
    });
  });

  describe('getDatabaseType', () => {
    it('should return mysql as default database type', () => {
      const type = DatabaseConfigManager.getDatabaseType();
      expect(type).toBe('mysql');
    });

    it('should return configured database type', () => {
      process.env.DATABASE_TYPE = 'dynamodb';
      process.env.AWS_REGION = 'us-east-1';
      process.env.DYNAMODB_TABLE_PREFIX = 'test_';
      
      DatabaseConfigManager.initialize();
      const type = DatabaseConfigManager.getDatabaseType();
      expect(type).toBe('dynamodb');
    });
  });

  describe('getMySQLConfig', () => {
    it('should return mysql config when type is mysql', () => {
      process.env.DATABASE_TYPE = 'mysql';
      DatabaseConfigManager.initialize();
      
      const mysqlConfig = DatabaseConfigManager.getMySQLConfig();
      expect(mysqlConfig).toBeDefined();
      expect(mysqlConfig.host).toBe('localhost'); // From test environment
    });

    it('should throw error when type is not mysql', () => {
      process.env.DATABASE_TYPE = 'dynamodb';
      process.env.AWS_REGION = 'us-east-1';
      process.env.DYNAMODB_TABLE_PREFIX = 'test_';
      
      DatabaseConfigManager.initialize();
      
      expect(() => {
        DatabaseConfigManager.getMySQLConfig();
      }).toThrow('MySQL configuration not available');
    });
  });

  describe('getDynamoDBConfig', () => {
    it('should return dynamodb config when type is dynamodb', () => {
      process.env.DATABASE_TYPE = 'dynamodb';
      process.env.AWS_REGION = 'us-west-2';
      process.env.DYNAMODB_TABLE_PREFIX = 'test_table_';
      
      DatabaseConfigManager.initialize();
      
      const dynamoConfig = DatabaseConfigManager.getDynamoDBConfig();
      expect(dynamoConfig).toBeDefined();
      expect(dynamoConfig.region).toBe('us-west-2');
      expect(dynamoConfig.tablePrefix).toBe('test_table_');
    });

    it('should throw error when type is not dynamodb', () => {
      process.env.DATABASE_TYPE = 'mysql';
      DatabaseConfigManager.initialize();
      
      expect(() => {
        DatabaseConfigManager.getDynamoDBConfig();
      }).toThrow('DynamoDB configuration not available');
    });
  });
});
