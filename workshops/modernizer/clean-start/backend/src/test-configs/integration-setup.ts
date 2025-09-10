// Integration Test Setup - Handle Database Connections Gracefully
import { config } from 'dotenv';
import { resolve } from 'path';

// Load integration test environment
config({ 
  path: resolve(__dirname, '../../.env.test.integration'),
  debug: process.env.DEBUG_ENV === 'true'
});

// Ensure we're using the integration test database
process.env.DB_NAME = 'online_shopping_store_test_integration';

// Global test setup for integration tests
// Since we run db:setup-integration before tests, assume database is available
let databaseAvailable = true;

export async function setupIntegrationTests(): Promise<void> {
  try {
    // Try to connect to database to verify it's working
    const { pool } = await import('../config/database');
    await pool.execute('SELECT 1');
    databaseAvailable = true;
    console.log('✅ Database connection established for integration tests');
  } catch (error) {
    console.warn('⚠️  Database not available for integration tests:', (error as Error).message);
    console.warn('⚠️  Integration tests requiring database will be skipped');
    databaseAvailable = false;
  }
}

export function isDatabaseAvailable(): boolean {
  return databaseAvailable;
}

export function skipIfNoDB(testName: string): void {
  if (!isDatabaseAvailable()) {
    console.log(`⏭️  Skipping ${testName} - database not available`);
  }
}

// Helper to conditionally skip tests based on database availability
export const skipIfNoDatabase = () => {
  if (!isDatabaseAvailable()) {
    console.log('⏭️  Skipping database-dependent test - database not available');
    return true;
  }
  return false;
};

export async function teardownIntegrationTests(): Promise<void> {
  if (databaseAvailable) {
    try {
      const { pool } = await import('../config/database');
      await pool.end();
      console.log('✅ Database connections closed');
    } catch (error) {
      console.warn('⚠️  Error closing database connections:', (error as Error).message);
    }
  }
}