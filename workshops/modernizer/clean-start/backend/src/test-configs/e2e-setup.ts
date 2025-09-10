// E2E Test Setup - Full Server, Real HTTP Requests, Complete Workflows
import { config } from 'dotenv';
import { setupE2EDatabase, teardownE2EDatabase, isE2EDatabaseAvailable } from './e2e-database-setup';

// Load e2e test environment with override to ensure proper isolation
config({ path: '.env.test.e2e', override: true });

// Global test timeout for e2e tests
jest.setTimeout(60000);

// Set test environment variables for e2e tests
process.env.NODE_ENV = 'test';

// Import test helpers
import { ServerTestHelper } from './test-helpers/server';
import { E2ETestHelper } from './test-helpers/e2e-helpers';

// Global setup for e2e tests (handled by global setup/teardown)
beforeAll(async () => {
  console.log('Setting up E2E test environment...');
  
  // Server startup is handled by global setup
  // Database setup for e2e tests with availability detection
  const dbAvailable = await setupE2EDatabase();
  
  if (!dbAvailable) {
    console.log('⚠️  E2E tests will run with limited functionality (no database)');
  }
});

// Global cleanup for e2e tests
afterAll(async () => {
  console.log('Cleaning up E2E test environment...');
  
  // Clean up test data
  if (isE2EDatabaseAvailable()) {
    await E2ETestHelper.cleanupTestData();
  }
  
  // Database cleanup
  await teardownE2EDatabase();
  
  // Server shutdown is handled by global teardown
});

// Clean up test data after each test
afterEach(async () => {
  if (isE2EDatabaseAvailable()) {
    await E2ETestHelper.cleanupTestData();
  }
});

// Global error handlers for e2e tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection in E2E Test:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception in E2E Test:', error);
});