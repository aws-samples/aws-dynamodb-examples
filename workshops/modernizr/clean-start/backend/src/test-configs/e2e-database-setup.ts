// E2E Database Setup - Enhanced database management for E2E tests
import { config } from 'dotenv';
import { resolve } from 'path';

// Load E2E test environment
config({ 
  path: resolve(__dirname, '../../.env.test.e2e'),
  debug: process.env.DEBUG_ENV === 'true'
});

let databaseAvailable = false;

export async function setupE2EDatabase(): Promise<boolean> {
  try {
    // Try to connect to database
    const { pool } = await import('../config/database');
    await pool.execute('SELECT 1');
    databaseAvailable = true;
    console.log('✅ E2E Database connection established');
    
    // Try to setup test database
    const { DatabaseTestHelper } = await import('./test-helpers/database');
    await DatabaseTestHelper.setupTestDatabase();
    
    return true;
  } catch (error) {
    console.warn('⚠️  E2E Database not available:', (error as Error).message);
    console.warn('⚠️  E2E tests requiring database will be skipped');
    databaseAvailable = false;
    return false;
  }
}

export async function teardownE2EDatabase(): Promise<void> {
  if (databaseAvailable) {
    try {
      const { DatabaseTestHelper } = await import('./test-helpers/database');
      await DatabaseTestHelper.cleanupTestDatabase();
      
      const { pool } = await import('../config/database');
      await pool.end();
      console.log('✅ E2E Database connections closed');
    } catch (error) {
      console.warn('⚠️  Error closing E2E database connections:', (error as Error).message);
    }
  }
}

export function isE2EDatabaseAvailable(): boolean {
  return databaseAvailable;
}

// Helper to conditionally skip tests based on database availability
export const skipIfNoE2EDatabase = () => {
  if (!databaseAvailable) {
    console.log('⏭️  Skipping E2E database-dependent test - database not available');
    return true;
  }
  return false;
};