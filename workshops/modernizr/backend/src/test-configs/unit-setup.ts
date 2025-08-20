// Unit Test Setup - Fast, Isolated, Mocked Dependencies
import { config } from 'dotenv';

// Load minimal test environment with override to ensure proper isolation
config({ path: '.env.test.unit', override: true });

// Global test timeout for unit tests (should be fast)
jest.setTimeout(10000);

// Mock console methods to reduce noise in unit tests
const originalConsole = { ...console };

beforeAll(() => {
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  console.log = originalConsole.log;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
});

// Set test environment variables for unit tests
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only-do-not-use-in-production-this-is-long-enough-for-security-validation';
process.env.BCRYPT_SALT_ROUNDS = process.env.BCRYPT_SALT_ROUNDS || '10';

// Mock database pool for unit tests (no real connections)
jest.mock('../config/database', () => ({
  pool: {
    execute: jest.fn(),
    getConnection: jest.fn(),
    end: jest.fn()
  },
  executeWithTracking: jest.fn(),
  executeQuery: jest.fn(),
  testConnection: jest.fn().mockResolvedValue(true),
  closePool: jest.fn().mockResolvedValue(undefined),
  getPoolStats: jest.fn().mockReturnValue({
    totalConnections: 10,
    activeConnections: 0,
    idleConnections: 0,
    queuedRequests: 0
  }),
  healthCheck: jest.fn().mockResolvedValue({
    healthy: true,
    details: { database: 'connected' }
  }),
  testDatabaseQuery: jest.fn().mockResolvedValue({
    success: true,
    details: {}
  })
}));

// Mock DynamoDB repositories to avoid configuration issues in unit tests
jest.mock('../database/implementations/dynamodb/DynamoDBUserRepository', () => {
  return {
    DynamoDBUserRepository: jest.fn().mockImplementation(() => ({
      findById: jest.fn(),
      findByUsername: jest.fn(),
      findByEmail: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      upgradeToSeller: jest.fn(),
      existsByUsername: jest.fn(),
      existsByEmail: jest.fn(),
      promoteToSuperAdmin: jest.fn(),
      demoteFromSuperAdmin: jest.fn(),
      findAllSuperAdmins: jest.fn()
    }))
  };
});

jest.mock('../database/implementations/dynamodb/DynamoDBProductRepository', () => {
  return {
    DynamoDBProductRepository: jest.fn().mockImplementation(() => ({
      findById: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findByCategory: jest.fn(),
      findBySeller: jest.fn(),
      search: jest.fn()
    }))
  };
});

jest.mock('../database/implementations/dynamodb/DynamoDBShoppingCartRepository', () => {
  return {
    DynamoDBShoppingCartRepository: jest.fn().mockImplementation(() => ({
      addToCart: jest.fn(),
      getCartByUserId: jest.fn(),
      updateCartItem: jest.fn(),
      removeFromCart: jest.fn(),
      clearCart: jest.fn(),
      getCartItemByUserAndProduct: jest.fn()
    }))
  };
});

jest.mock('../database/implementations/dynamodb/DynamoDBCategoryRepository', () => {
  return {
    DynamoDBCategoryRepository: jest.fn().mockImplementation(() => ({
      findAll: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findByParentId: jest.fn()
    }))
  };
});

jest.mock('../database/implementations/dynamodb/DynamoDBOrderRepository', () => {
  return {
    DynamoDBOrderRepository: jest.fn().mockImplementation(() => ({
      create: jest.fn(),
      findById: jest.fn(),
      findByUserId: jest.fn(),
      findBySellerId: jest.fn(),
      updateStatus: jest.fn(),
      findAll: jest.fn()
    }))
  };
});

// Global error handlers for unit tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection in Unit Test:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception in Unit Test:', error);
});