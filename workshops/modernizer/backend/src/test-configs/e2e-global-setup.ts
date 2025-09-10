// E2E Global Setup - Start Test Server
import { config } from 'dotenv';
import { ServerTestHelper } from './test-helpers/server';

// Load e2e test environment with override to ensure proper isolation
config({ path: '.env.test.e2e', override: true });

export default async function globalSetup() {
  console.log('🚀 Starting E2E test server...');
  
  try {
    const serverUrl = await ServerTestHelper.startTestServer();
    
    // Store server URL for tests to use
    (global as any).__SERVER_URL__ = serverUrl;
    
    // Verify server health
    const health = await ServerTestHelper.getServerHealth();
    console.log(`📊 Server health: ${health.status}`);
    
    // Wait for critical endpoints to be available
    await ServerTestHelper.waitForEndpoint('/api/health');
    
    console.log(`✅ E2E test server started at: ${serverUrl}`);
    console.log('🔧 Server is ready for E2E testing');
  } catch (error) {
    console.error('❌ Failed to start E2E test server:', error);
    
    // Attempt cleanup on failure
    try {
      await ServerTestHelper.stopTestServer();
    } catch (cleanupError) {
      console.error('❌ Failed to cleanup after server start failure:', cleanupError);
    }
    
    throw error;
  }
}