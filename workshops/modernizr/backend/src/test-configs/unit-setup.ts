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
  testConnection: jest.fn().mockResolvedValue(true),
  closePool: jest.fn().mockResolvedValue(undefined),
  getPoolStats: jest.fn().mockReturnValue({
    totalConnections: 10,
    activeConnections: 0,
    idleConnections: 0,
    queuedRequests: 0
  })
}));

// Global error handlers for unit tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection in Unit Test:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception in Unit Test:', error);
});