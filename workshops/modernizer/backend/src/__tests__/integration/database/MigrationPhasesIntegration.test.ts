import { UserDualReadWrapper } from '../../../database/wrappers/UserDualReadWrapper';
import { UserDualWriteWrapper } from '../../../database/wrappers/UserDualWriteWrapper';
import { MySQLUserRepository } from '../../../database/implementations/mysql/MySQLUserRepository';
import { DynamoDBUserRepository } from '../../../database/implementations/dynamodb/DynamoDBUserRepository';
import { FeatureFlagService } from '../../../services/FeatureFlagService';
import { User } from '../../../models/User';
import { isDynamoDBAvailable, isMySQLAvailable, setupIntegrationTests, teardownIntegrationTests } from '../../../test-configs/integration-setup';
import { CreateTableCommand, DynamoDBClient, DeleteTableCommand } from '@aws-sdk/client-dynamodb';

const describeIfBothDB = (isDynamoDBAvailable() && isMySQLAvailable()) ? describe : describe.skip;

describeIfBothDB('Migration Phases - Integration Tests', () => {
  let readWrapper: UserDualReadWrapper;
  let writeWrapper: UserDualWriteWrapper;
  let mysqlRepo: MySQLUserRepository;
  let dynamodbRepo: DynamoDBUserRepository;
  let featureFlagService: FeatureFlagService;
  let dynamoClient: DynamoDBClient;

  const testUser = {
    username: 'integrationtest',
    email: 'integration@test.com',
    password: 'testpassword',
    password_hash: 'hashed_password_123',
    first_name: 'Integration',
    last_name: 'Test'
  };

  beforeAll(async () => {
    await setupIntegrationTests();
    
    // Set up DynamoDB environment
    process.env.DATABASE_TYPE = 'dynamodb';
    process.env.AWS_REGION = 'us-east-1';
    process.env.DYNAMODB_ENDPOINT = 'http://localhost:8000';
    process.env.DYNAMODB_TABLE_PREFIX = 'test_';
    process.env.AWS_ACCESS_KEY_ID = 'test';
    process.env.AWS_SECRET_ACCESS_KEY = 'test';
    
    // Initialize DynamoDB client
    dynamoClient = new DynamoDBClient({
      region: 'us-east-1',
      endpoint: 'http://localhost:8000',
      credentials: {
        accessKeyId: 'test',
        secretAccessKey: 'test'
      }
    });

    // Create DynamoDB table for testing
    await createDynamoDBTable();
    
    // Initialize repositories
    mysqlRepo = new MySQLUserRepository();
    dynamodbRepo = new DynamoDBUserRepository('users');
    featureFlagService = new FeatureFlagService();
    
    // Initialize wrappers
    readWrapper = new UserDualReadWrapper(mysqlRepo, dynamodbRepo, featureFlagService);
    writeWrapper = new UserDualWriteWrapper(mysqlRepo, dynamodbRepo, featureFlagService);
  }, 30000);

  beforeEach(async () => {
    // Clean up test data
    await cleanupTestData();
    FeatureFlagService.reset();
  });

  afterAll(async () => {
    await cleanupTestData();
    await deleteDynamoDBTable();
    await teardownIntegrationTests();
  });

  async function createDynamoDBTable() {
    try {
      const createTableCommand = new CreateTableCommand({
        TableName: 'test_users',
        KeySchema: [
          { AttributeName: 'PK', KeyType: 'HASH' },
          { AttributeName: 'SK', KeyType: 'RANGE' }
        ],
        AttributeDefinitions: [
          { AttributeName: 'PK', AttributeType: 'S' },
          { AttributeName: 'SK', AttributeType: 'S' },
          { AttributeName: 'GSI1PK', AttributeType: 'S' },
          { AttributeName: 'GSI2PK', AttributeType: 'S' }
        ],
        GlobalSecondaryIndexes: [
          {
            IndexName: 'GSI1',
            KeySchema: [{ AttributeName: 'GSI1PK', KeyType: 'HASH' }],
            Projection: { ProjectionType: 'ALL' },
            ProvisionedThroughput: {
              ReadCapacityUnits: 5,
              WriteCapacityUnits: 5
            }
          },
          {
            IndexName: 'GSI2',
            KeySchema: [{ AttributeName: 'GSI2PK', KeyType: 'HASH' }],
            Projection: { ProjectionType: 'ALL' },
            ProvisionedThroughput: {
              ReadCapacityUnits: 5,
              WriteCapacityUnits: 5
            }
          }
        ],
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5
        }
      });
      
      await dynamoClient.send(createTableCommand);
      console.log('✅ Created test_users table for integration tests');
    } catch (error: any) {
      if (error.name !== 'ResourceInUseException') {
        console.error('Failed to create DynamoDB table:', error);
        throw error;
      }
      console.log('✅ test_users table already exists');
    }
  }

  async function deleteDynamoDBTable() {
    try {
      const deleteTableCommand = new DeleteTableCommand({
        TableName: 'test_users'
      });
      await dynamoClient.send(deleteTableCommand);
      console.log('✅ Deleted test_users table');
    } catch (error: any) {
      if (error.name !== 'ResourceNotFoundException') {
        console.error('Failed to delete DynamoDB table:', error);
      }
    }
  }

  async function cleanupTestData() {
    try {
      // Find and delete test user from both databases
      const mysqlUser = await mysqlRepo.findByUsername(testUser.username);
      if (mysqlUser) {
        await mysqlRepo.delete(mysqlUser.id);
      }

      const dynamoUser = await dynamodbRepo.findByUsername(testUser.username);
      if (dynamoUser) {
        await dynamodbRepo.delete(dynamoUser.id);
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  describe('Phase 1: MySQL Only Integration', () => {
    beforeEach(() => {
      FeatureFlagService.setMigrationPhase(1);
    });

    it('should write to MySQL only and read from MySQL only', async () => {
      // Create user
      const createdUser = await writeWrapper.create(testUser);
      expect(createdUser).toBeDefined();
      expect(createdUser.username).toBe(testUser.username);
      expect(createdUser.id).toBeDefined();

      // Verify user exists in MySQL
      const mysqlUser = await mysqlRepo.findById(createdUser.id);
      expect(mysqlUser).toBeDefined();
      expect(mysqlUser!.username).toBe(testUser.username);

      // Verify user does NOT exist in DynamoDB
      const dynamoUser = await dynamodbRepo.findById(createdUser.id);
      expect(dynamoUser).toBeNull();

      // Read through wrapper should return MySQL data
      const readUser = await readWrapper.findById(createdUser.id);
      expect(readUser).toBeDefined();
      expect(readUser!.username).toBe(testUser.username);
    });
  });

  describe('Phase 2: Dual Write + MySQL Read Integration', () => {
    beforeEach(() => {
      FeatureFlagService.setMigrationPhase(2);
    });

    it('should write to both databases and read from MySQL', async () => {
      // Create user
      const createdUser = await writeWrapper.create(testUser);
      expect(createdUser).toBeDefined();
      expect(createdUser.id).toBeDefined();

      // Verify user exists in MySQL
      const mysqlUser = await mysqlRepo.findById(createdUser.id);
      expect(mysqlUser).toBeDefined();
      expect(mysqlUser!.username).toBe(testUser.username);

      // Verify user exists in DynamoDB with same ID
      const dynamoUser = await dynamodbRepo.findById(createdUser.id);
      expect(dynamoUser).toBeDefined();
      expect(dynamoUser!.username).toBe(testUser.username);
      expect(dynamoUser!.id).toBe(createdUser.id);

      // Read through wrapper should return MySQL data
      const readUser = await readWrapper.findById(createdUser.id);
      expect(readUser).toBeDefined();
      expect(readUser!.username).toBe(testUser.username);
    });
  });

  describe('Phase 5: DynamoDB Only Integration', () => {
    beforeEach(() => {
      FeatureFlagService.setMigrationPhase(5);
    });

    it('should write to DynamoDB only and read from DynamoDB only', async () => {
      // Create user
      const createdUser = await writeWrapper.create(testUser);
      expect(createdUser).toBeDefined();
      expect(createdUser.username).toBe(testUser.username);

      // Verify user exists in DynamoDB
      const dynamoUser = await dynamodbRepo.findById(createdUser.id);
      expect(dynamoUser).toBeDefined();
      expect(dynamoUser!.username).toBe(testUser.username);

      // Verify user does NOT exist in MySQL
      const mysqlUser = await mysqlRepo.findById(createdUser.id);
      expect(mysqlUser).toBeNull();

      // Read should come from DynamoDB
      const readUser = await readWrapper.findById(createdUser.id);
      expect(readUser).toBeDefined();
      expect(readUser!.username).toBe(testUser.username);
    });
  });
});
