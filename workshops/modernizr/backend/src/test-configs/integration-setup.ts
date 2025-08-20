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
let mysqlAvailable = true;
let dynamodbAvailable = true;

export async function setupIntegrationTests(): Promise<void> {
  // Test MySQL connection
  try {
    const { pool } = await import('../config/database');
    await pool.execute('SELECT 1');
    mysqlAvailable = true;
    console.log('✅ MySQL connection established for integration tests');
  } catch (error) {
    console.warn('⚠️  MySQL not available for integration tests:', (error as Error).message);
    mysqlAvailable = false;
  }

  // Test DynamoDB Local connection
  try {
    const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb');
    const { ListTablesCommand } = await import('@aws-sdk/client-dynamodb');
    
    const client = new DynamoDBClient({
      region: process.env.DYNAMODB_REGION || 'us-east-1',
      endpoint: process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000',
      credentials: {
        accessKeyId: 'test',
        secretAccessKey: 'test'
      }
    });
    
    await client.send(new ListTablesCommand({}));
    dynamodbAvailable = true;
    console.log('✅ DynamoDB Local connection established for integration tests');
  } catch (error) {
    console.warn('⚠️  DynamoDB Local not available for integration tests:', (error as Error).message);
    console.warn('⚠️  Start DynamoDB Local with: docker run -p 8000:8000 amazon/dynamodb-local');
    dynamodbAvailable = false;
  }
}

export function isMySQLAvailable(): boolean {
  return mysqlAvailable;
}

export function isDynamoDBAvailable(): boolean {
  return dynamodbAvailable;
}

export function isDatabaseAvailable(): boolean {
  return mysqlAvailable;
}

export async function teardownIntegrationTests(): Promise<void> {
  if (mysqlAvailable) {
    try {
      const { pool } = await import('../config/database');
      await pool.end();
      console.log('✅ MySQL connections closed');
    } catch (error) {
      console.warn('⚠️  Error closing MySQL connections:', (error as Error).message);
    }
  }
}