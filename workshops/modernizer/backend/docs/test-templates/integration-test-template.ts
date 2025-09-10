/**
 * Integration Test Template
 * 
 * Use this template for testing interactions between multiple components.
 * Integration tests use real database connections and test component interactions.
 */

import request from 'supertest';
import { app } from '../path/to/app';
import { DatabaseTestHelper } from '../test-configs/test-helpers/database';
import { ComponentA } from '../path/to/componentA';
import { ComponentB } from '../path/to/componentB';

// Mock only external services (not internal components)
jest.mock('../services/ExternalService', () => ({
  ExternalService: {
    callExternalAPI: jest.fn(),
    sendNotification: jest.fn(),
  }
}));

describe('Feature Integration Tests', () => {
  let componentA: ComponentA;
  let componentB: ComponentB;

  beforeAll(async () => {
    // Set up test database
    await DatabaseTestHelper.setupTestDatabase();
  });

  afterAll(async () => {
    // Clean up test database
    await DatabaseTestHelper.cleanupTestDatabase();
  });

  beforeEach(async () => {
    // Clear test data between tests
    await DatabaseTestHelper.clearTestData();
    
    // Reset external service mocks
    jest.clearAllMocks();
    
    // Initialize components (using real dependencies)
    componentA = new ComponentA();
    componentB = new ComponentB();
  });

  describe('API Integration Tests', () => {
    describe('POST /api/resource', () => {
      it('should create resource and store in database', async () => {
        // Arrange
        const resourceData = {
          name: 'Test Resource',
          description: 'Integration test resource',
          category: 'test'
        };

        // Act
        const response = await request(app)
          .post('/api/resource')
          .send(resourceData)
          .expect(201);

        // Assert
        expect(response.body.data.resource.name).toBe(resourceData.name);
        expect(response.body.data.resource.id).toBeDefined();

        // Verify data was actually stored in database
        const storedResource = await DatabaseTestHelper.findResourceById(
          response.body.data.resource.id
        );
        expect(storedResource).toBeTruthy();
        expect(storedResource.name).toBe(resourceData.name);
      });

      it('should return validation error for invalid data', async () => {
        // Arrange
        const invalidData = {
          name: '', // Invalid: empty name
          description: 'Test description'
          // Missing required category
        };

        // Act
        const response = await request(app)
          .post('/api/resource')
          .send(invalidData)
          .expect(400);

        // Assert
        expect(response.body.error).toBe('Validation failed');
        expect(response.body.details).toContain('name');
        expect(response.body.details).toContain('category');

        // Verify no data was stored
        const resourceCount = await DatabaseTestHelper.countResources();
        expect(resourceCount).toBe(0);
      });
    });

    describe('GET /api/resource/:id', () => {
      it('should retrieve resource from database', async () => {
        // Arrange
        const testResource = await DatabaseTestHelper.createTestResource({
          name: 'Test Resource',
          description: 'Test description',
          category: 'test'
        });

        // Act
        const response = await request(app)
          .get(`/api/resource/${testResource.id}`)
          .expect(200);

        // Assert
        expect(response.body.data.resource.id).toBe(testResource.id);
        expect(response.body.data.resource.name).toBe(testResource.name);
      });

      it('should return 404 for non-existent resource', async () => {
        // Arrange
        const nonExistentId = 99999;

        // Act
        const response = await request(app)
          .get(`/api/resource/${nonExistentId}`)
          .expect(404);

        // Assert
        expect(response.body.error).toBe('Resource not found');
      });
    });
  });

  describe('Service Integration Tests', () => {
    it('should integrate ComponentA and ComponentB correctly', async () => {
      // Arrange
      const testData = {
        input: 'integration test data',
        options: { processAsync: true }
      };

      // Create test data in database
      const testRecord = await DatabaseTestHelper.createTestRecord(testData);

      // Act
      const resultA = await componentA.processData(testRecord.id);
      const resultB = await componentB.enhanceData(resultA);

      // Assert
      expect(resultB.processed).toBe(true);
      expect(resultB.enhanced).toBe(true);
      expect(resultB.originalData).toBe(testData.input);

      // Verify database state
      const updatedRecord = await DatabaseTestHelper.findRecordById(testRecord.id);
      expect(updatedRecord.status).toBe('processed');
      expect(updatedRecord.enhanced_at).toBeDefined();
    });

    it('should handle transaction rollback on failure', async () => {
      // Arrange
      const testData = { input: 'test data' };
      const testRecord = await DatabaseTestHelper.createTestRecord(testData);

      // Mock external service to fail
      const mockExternalService = require('../services/ExternalService');
      mockExternalService.ExternalService.callExternalAPI.mockRejectedValue(
        new Error('External service unavailable')
      );

      // Act & Assert
      await expect(componentA.processWithExternalCall(testRecord.id))
        .rejects
        .toThrow('External service unavailable');

      // Verify database rollback
      const unchangedRecord = await DatabaseTestHelper.findRecordById(testRecord.id);
      expect(unchangedRecord.status).toBe('pending'); // Should not be changed
      expect(unchangedRecord.processed_at).toBeNull();
    });
  });

  describe('Database Integration Tests', () => {
    it('should handle complex database queries correctly', async () => {
      // Arrange
      const user = await DatabaseTestHelper.createTestUser({
        username: 'testuser',
        email: 'test@example.com'
      });

      const resources = await Promise.all([
        DatabaseTestHelper.createTestResource({ name: 'Resource 1', owner_id: user.id }),
        DatabaseTestHelper.createTestResource({ name: 'Resource 2', owner_id: user.id }),
        DatabaseTestHelper.createTestResource({ name: 'Resource 3', owner_id: user.id })
      ]);

      // Act
      const userWithResources = await componentA.getUserWithResources(user.id);

      // Assert
      expect(userWithResources.id).toBe(user.id);
      expect(userWithResources.resources).toHaveLength(3);
      expect(userWithResources.resources.map(r => r.name)).toEqual(
        expect.arrayContaining(['Resource 1', 'Resource 2', 'Resource 3'])
      );
    });

    it('should handle database constraints correctly', async () => {
      // Arrange
      const user = await DatabaseTestHelper.createTestUser({
        username: 'testuser',
        email: 'test@example.com'
      });

      // Act & Assert - Try to create duplicate user
      await expect(
        DatabaseTestHelper.createTestUser({
          username: 'testuser', // Duplicate username
          email: 'different@example.com'
        })
      ).rejects.toThrow('Username already exists');

      // Verify only one user exists
      const userCount = await DatabaseTestHelper.countUsers();
      expect(userCount).toBe(1);
    });
  });

  describe('Authentication Integration Tests', () => {
    it('should authenticate user and access protected resource', async () => {
      // Arrange
      const userData = {
        username: 'integrationuser',
        email: 'integration@test.com',
        password: 'SecurePass123!'
      };

      // Create user
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      const token = registerResponse.body.data.token;

      // Act - Access protected resource
      const protectedResponse = await request(app)
        .get('/api/protected-resource')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Assert
      expect(protectedResponse.body.data.user.username).toBe(userData.username);
      expect(protectedResponse.body.data.message).toBe('Access granted');
    });

    it('should reject invalid token', async () => {
      // Arrange
      const invalidToken = 'invalid.jwt.token';

      // Act
      const response = await request(app)
        .get('/api/protected-resource')
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(401);

      // Assert
      expect(response.body.error).toBe('Invalid token');
    });
  });
});

/**
 * Integration Test Checklist:
 * 
 * ✅ Real database connections are used
 * ✅ Components interact with real dependencies
 * ✅ External services are mocked appropriately
 * ✅ Database is set up and cleaned up properly
 * ✅ Test data is isolated between tests
 * ✅ API endpoints are tested end-to-end
 * ✅ Database transactions and constraints are tested
 * ✅ Authentication and authorization flows are tested
 * ✅ Error handling and rollback scenarios are covered
 * ✅ Tests complete within reasonable time (< 60 seconds total)
 */