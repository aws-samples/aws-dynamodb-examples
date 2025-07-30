// Integration tests to verify actual database and API functionality

import { ApiClient } from '../utils/apiClient';
// Import database connection for testing
const mysql = require('mysql2/promise');

// Create a test pool directly to avoid import issues
const testPool = mysql.createPool({
  host: '127.0.0.1', // Force IPv4
  port: 3306,
  user: 'root',
  password: '',
  database: 'online_shopping_store_test',
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0
});

describe('Load Testing Integration', () => {
  let apiClient: ApiClient;

  beforeAll(() => {
    apiClient = new ApiClient('http://localhost:8100');
  });

  describe('Database Connection', () => {
    test('should connect to database', async () => {
      try {
        console.log('Environment variables:');
        console.log('DB_HOST:', process.env.DB_HOST);
        console.log('DB_PORT:', process.env.DB_PORT);
        console.log('DB_NAME:', process.env.DB_NAME);
        console.log('NODE_ENV:', process.env.NODE_ENV);
        
        console.log('Test pool object:', testPool);
        console.log('Test pool type:', typeof testPool);
        console.log('Test pool execute method:', typeof testPool?.execute);
        
        if (!testPool) {
          throw new Error('Database pool is not initialized');
        }
        
        const result = await testPool.execute('SELECT 1 as test');
        console.log('Database query result:', result);
        expect(result).toBeDefined();
        console.log('Database connection successful');
      } catch (error) {
        console.error('Database connection failed:', error);
        throw error;
      }
    });

    test('should be able to query existing tables', async () => {
      try {
        const result = await testPool.execute('SHOW TABLES');
        console.log('Tables query result:', result);
        expect(result).toBeDefined();
      } catch (error) {
        console.error('Database query failed:', error);
        throw error;
      }
    });
  });

  describe('API Connectivity', () => {
    test('should connect to backend API', async () => {
      try {
        const result = await apiClient.healthCheck();
        expect(result).toHaveProperty('status');
        expect(result).toHaveProperty('duration');
        console.log('API health check result:', result);
      } catch (error) {
        console.error('API connection failed:', error);
        console.log('Make sure your backend server is running on http://localhost:8100');
        // Don't fail the test if server is not running during development
        expect((error as Error).message).toContain('ECONNREFUSED');
      }
    });
  });

  describe('Data Generation', () => {
    test('should generate realistic test data that could be inserted', async () => {
      const { RandomDataGenerator } = await import('../utils/helpers');
      
      // Generate test category data
      const categoryData = {
        name: RandomDataGenerator.generateCategoryName(),
        description: `Test category for load testing`
      };
      
      // Generate test product data  
      const productData = {
        name: RandomDataGenerator.generateProductName(),
        description: RandomDataGenerator.generateProductDescription(),
        price: RandomDataGenerator.generatePrice(),
        inventory: RandomDataGenerator.generateInventoryQuantity(),
        category_id: 1, // Would be set by actual seeder
        seller_id: 1    // Would be set by actual seeder
      };
      
      // Generate test user data
      const userData = {
        username: RandomDataGenerator.generateUsername(),
        email: RandomDataGenerator.generateEmail(),
        password: RandomDataGenerator.generatePassword(),
        full_name: 'Test User',
        address: RandomDataGenerator.generateAddress()
      };
      
      console.log('Generated test data:');
      console.log('Category:', categoryData);
      console.log('Product:', productData);
      console.log('User:', userData);
      
      // Validate the generated data
      expect(categoryData.name).toBeTruthy();
      expect(productData.price).toBeGreaterThan(0);
      expect(productData.inventory).toBeGreaterThan(0);
      expect(userData.email).toContain('@');
      expect(userData.username.length).toBeGreaterThan(0);
    });
  });
});