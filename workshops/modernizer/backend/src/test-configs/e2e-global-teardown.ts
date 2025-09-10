// E2E Global Teardown - Stop Test Server and Close Connections
import { ServerTestHelper } from './test-helpers/server';
import { teardownE2EDatabase } from './e2e-database-setup';

export default async function globalTeardown() {
  console.log('🛑 Stopping E2E test server...');
  
  try {
    await ServerTestHelper.stopTestServer();
    console.log('✅ E2E test server stopped successfully');
  } catch (error) {
    console.error('❌ Error stopping E2E test server:', error);
    // Don't throw here to avoid masking test failures
  }

  try {
    await teardownE2EDatabase();
    console.log('✅ E2E database connections closed');
  } catch (error) {
    console.error('❌ Error closing E2E database connections:', error);
    // Don't throw here to avoid masking test failures
  }
}