require('dotenv').config({ path: '.env.test.integration' });

console.log('Environment variables:');
console.log('DATABASE_TYPE:', process.env.DATABASE_TYPE);
console.log('DYNAMODB_TABLE_PREFIX:', process.env.DYNAMODB_TABLE_PREFIX);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('AWS_REGION:', process.env.AWS_REGION);

// Import and test the configuration
const { DatabaseConfigManager } = require('./dist/database/config/DatabaseConfig');

try {
  const config = DatabaseConfigManager.initialize();
  console.log('\nDynamoDB Config:', config.dynamodb);
  
  // Test table name generation
  const { DynamoDBClientManager } = require('./dist/database/config/DynamoDBClient');
  console.log('\nTable name for "users":', DynamoDBClientManager.getTableName('users'));
  console.log('Table name for "products":', DynamoDBClientManager.getTableName('products'));
} catch (error) {
  console.error('Error:', error.message);
}
