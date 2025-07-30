// Integration Test Setup - Handle Database Connections Gracefully
import { config } from 'dotenv';
import { resolve } from 'path';

// Load integration test environment
config({ 
  path: resolve(__dirname, '../../.env.test.integration'),
  debug: process.env.DEBUG_ENV === 'true'
});

// Global test setup for integration tests
let databaseAvailable = false;

export async function setupIntegrationTests(): Promise<void> {
  try {
    // Try to connect to database
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

export function isDatabaseAvailable(): boolean {
  return databaseAvailable;
}

export function skipIfNoDB(testName: string): void {
  if (!databaseAvailable) {
    console.log(`⏭️  Skipping ${testName} - database not available`);
  }
}

// Helper to conditionally skip tests based on database availability
export const skipIfNoDatabase = () => {
  if (!databaseAvailable) {
    console.log('⏭️  Skipping database-dependent test - database not available');
    return true;
  }
  return false;
};