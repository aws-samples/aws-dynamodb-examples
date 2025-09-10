// E2E Test - Complete Authentication Workflow
import { E2ETestHelper } from '../../../test-configs/test-helpers/e2e-helpers';
import { ServerTestHelper } from '../../../test-configs/test-helpers/server';

describe('Authentication Workflow E2E', () => {
  afterEach(async () => {
    await E2ETestHelper.cleanupTestData();
  });

  describe('User Registration Flow', () => {
    it('should complete full user registration workflow', async () => {
      const userData = {
        username: 'e2e_new_user',
        email: 'newuser@e2e.test',
        password: 'SecurePassword123!',
        first_name: 'John',
        last_name: 'Doe'
      };

      // Step 1: Register new user
      const registerResponse = await ServerTestHelper.makeRequest({
        method: 'POST',
        url: '/api/auth/register',
        data: userData
      });

      E2ETestHelper.validateResponse(registerResponse, 201, {
        success: true,
        data: {
          user: {
            username: userData.username,
            email: userData.email,
            first_name: userData.first_name,
            last_name: userData.last_name,
            is_seller: false
          },
          token: expect.any(String)
        }
      });

      const { user, token } = registerResponse.data.data;

      // Step 2: Verify user can access protected routes
      const profileResponse = await E2ETestHelper.makeAuthenticatedRequest({
        method: 'GET',
        url: '/api/auth/profile'
      }, token);

      E2ETestHelper.validateResponse(profileResponse, 200, {
        success: true,
        data: {
          user: {
            id: user.id,
            username: userData.username,
            email: userData.email
          }
        }
      });

      // Step 3: Verify user can login with credentials
      const loginResponse = await ServerTestHelper.makeRequest({
        method: 'POST',
        url: '/api/auth/login',
        data: {
          username: userData.username,
          password: userData.password
        }
      });

      E2ETestHelper.validateResponse(loginResponse, 200, {
        success: true,
        data: {
          user: {
            username: userData.username,
            email: userData.email
          },
          token: expect.any(String)
        }
      });

      // Step 4: Verify new token works
      const newToken = loginResponse.data.data.token;
      const verifyResponse = await E2ETestHelper.makeAuthenticatedRequest({
        method: 'GET',
        url: '/api/auth/profile'
      }, newToken);

      expect(verifyResponse.status).toBe(200);
    });

    it('should prevent duplicate user registration', async () => {
      const userData = {
        username: 'e2e_duplicate_user',
        email: 'duplicate@e2e.test',
        password: 'Password123!'
      };

      // Step 1: First registration should succeed
      const firstResponse = await ServerTestHelper.makeRequest({
        method: 'POST',
        url: '/api/auth/register',
        data: userData
      });

      expect(firstResponse.status).toBe(201);

      // Step 2: Second registration with same username should fail
      const duplicateUsernameResponse = await ServerTestHelper.makeRequest({
        method: 'POST',
        url: '/api/auth/register',
        data: {
          ...userData,
          email: 'different@e2e.test'
        }
      });

      E2ETestHelper.validateErrorResponse(duplicateUsernameResponse, 409, 'Username already exists');

      // Step 3: Second registration with same email should fail
      const duplicateEmailResponse = await ServerTestHelper.makeRequest({
        method: 'POST',
        url: '/api/auth/register',
        data: {
          ...userData,
          username: 'different_username'
        }
      });

      E2ETestHelper.validateErrorResponse(duplicateEmailResponse, 409, 'Email already exists');
    });

    it('should validate registration input', async () => {
      // Test invalid email
      const invalidEmailResponse = await ServerTestHelper.makeRequest({
        method: 'POST',
        url: '/api/auth/register',
        data: {
          username: 'testuser',
          email: 'invalid-email',
          password: 'Password123!'
        }
      });

      expect(invalidEmailResponse.status).toBe(400);

      // Test weak password
      const weakPasswordResponse = await ServerTestHelper.makeRequest({
        method: 'POST',
        url: '/api/auth/register',
        data: {
          username: 'testuser2',
          email: 'test@example.com',
          password: '123'
        }
      });

      expect(weakPasswordResponse.status).toBe(400);

      // Test missing required fields
      const missingFieldsResponse = await ServerTestHelper.makeRequest({
        method: 'POST',
        url: '/api/auth/register',
        data: {
          username: 'testuser3'
          // Missing email and password
        }
      });

      expect(missingFieldsResponse.status).toBe(400);
    });
  });

  describe('User Login Flow', () => {
    it('should complete full login workflow', async () => {
      // Setup: Create a user first
      const user = await E2ETestHelper.createTestUser({
        username: 'e2e_login_user',
        email: 'login@e2e.test',
        password: 'LoginPassword123!'
      });

      // Step 1: Login with correct credentials
      const loginResponse = await ServerTestHelper.makeRequest({
        method: 'POST',
        url: '/api/auth/login',
        data: {
          username: user.username,
          password: user.password
        }
      });

      E2ETestHelper.validateResponse(loginResponse, 200, {
        success: true,
        data: {
          user: {
            username: user.username,
            email: user.email
          },
          token: expect.any(String)
        }
      });

      // Step 2: Use token to access protected resource
      const token = loginResponse.data.data.token;
      const protectedResponse = await E2ETestHelper.makeAuthenticatedRequest({
        method: 'GET',
        url: '/api/auth/profile'
      }, token);

      expect(protectedResponse.status).toBe(200);
      expect(protectedResponse.data.data.user.username).toBe(user.username);
    });

    it('should reject invalid login credentials', async () => {
      // Setup: Create a user first
      const user = await E2ETestHelper.createTestUser({
        username: 'e2e_auth_user',
        password: 'CorrectPassword123!'
      });

      // Test wrong password
      const wrongPasswordResponse = await ServerTestHelper.makeRequest({
        method: 'POST',
        url: '/api/auth/login',
        data: {
          username: user.username,
          password: 'WrongPassword123!'
        }
      });

      E2ETestHelper.validateErrorResponse(wrongPasswordResponse, 401, 'Invalid username or password');

      // Test non-existent user
      const nonExistentUserResponse = await ServerTestHelper.makeRequest({
        method: 'POST',
        url: '/api/auth/login',
        data: {
          username: 'non_existent_user',
          password: 'Password123!'
        }
      });

      E2ETestHelper.validateErrorResponse(nonExistentUserResponse, 401, 'Invalid username or password');
    });

    it('should validate login input', async () => {
      // Test missing username
      const missingUsernameResponse = await ServerTestHelper.makeRequest({
        method: 'POST',
        url: '/api/auth/login',
        data: {
          password: 'Password123!'
        }
      });

      expect(missingUsernameResponse.status).toBe(400);

      // Test missing password
      const missingPasswordResponse = await ServerTestHelper.makeRequest({
        method: 'POST',
        url: '/api/auth/login',
        data: {
          username: 'testuser'
        }
      });

      expect(missingPasswordResponse.status).toBe(400);
    });
  });

  describe('Profile Management Flow', () => {
    it('should complete profile update workflow', async () => {
      // Setup: Create and login user
      const user = await E2ETestHelper.createTestUser({
        username: 'e2e_profile_user',
        first_name: 'Original',
        last_name: 'Name'
      });

      // Step 1: Get current profile
      const currentProfileResponse = await E2ETestHelper.makeAuthenticatedRequest({
        method: 'GET',
        url: '/api/auth/profile'
      }, user.token);

      expect(currentProfileResponse.status).toBe(200);
      expect(currentProfileResponse.data.data.user.first_name).toBe('Original');

      // Step 2: Update profile
      const updateData = {
        first_name: 'Updated',
        last_name: 'Profile',
        email: 'updated@e2e.test'
      };

      const updateResponse = await E2ETestHelper.makeAuthenticatedRequest({
        method: 'PUT',
        url: '/api/auth/profile',
        data: updateData
      }, user.token);

      E2ETestHelper.validateResponse(updateResponse, 200, {
        success: true,
        data: {
          first_name: 'Updated',
          last_name: 'Profile',
          email: 'updated@e2e.test',
          username: user.username // Should remain unchanged
        }
      });

      // Step 3: Verify changes persisted
      const verifyResponse = await E2ETestHelper.makeAuthenticatedRequest({
        method: 'GET',
        url: '/api/auth/profile'
      }, user.token);

      expect(verifyResponse.status).toBe(200);
      expect(verifyResponse.data.data.user.first_name).toBe('Updated');
      expect(verifyResponse.data.data.user.last_name).toBe('Profile');
      expect(verifyResponse.data.data.user.email).toBe('updated@e2e.test');
    });

    it('should upgrade user to seller', async () => {
      // Setup: Create regular user
      const user = await E2ETestHelper.createTestUser({
        username: 'e2e_upgrade_user',
        is_seller: false
      });

      // Verify user is not a seller initially
      expect(user.is_seller).toBe(false);

      // Step 1: Upgrade to seller
      const upgradeResponse = await E2ETestHelper.makeAuthenticatedRequest({
        method: 'POST',
        url: '/api/auth/upgrade-seller'
      }, user.token);

      E2ETestHelper.validateResponse(upgradeResponse, 200, {
        success: true,
        data: {
          is_seller: true
        }
      });

      // Step 2: Verify seller status in profile
      const profileResponse = await E2ETestHelper.makeAuthenticatedRequest({
        method: 'GET',
        url: '/api/auth/profile'
      }, user.token);

      expect(profileResponse.status).toBe(200);
      expect(profileResponse.data.data.user.is_seller).toBe(true);

      // Step 3: Verify seller can access seller routes
      const sellerResponse = await E2ETestHelper.makeAuthenticatedRequest({
        method: 'GET',
        url: '/api/seller/dashboard'
      }, user.token);

      // Should not get 403 Forbidden
      expect(sellerResponse.status).not.toBe(403);
    });
  });

  describe('Authentication Security Flow', () => {
    it('should reject requests with invalid tokens', async () => {
      // Test with invalid token
      const invalidTokenResponse = await E2ETestHelper.makeAuthenticatedRequest({
        method: 'GET',
        url: '/api/auth/profile'
      }, 'invalid.jwt.token');

      E2ETestHelper.validateErrorResponse(invalidTokenResponse, 401, 'Invalid or expired token');

      // Test with expired token (simulate)
      const expiredTokenResponse = await ServerTestHelper.makeRequest({
        method: 'GET',
        url: '/api/auth/profile',
        headers: {
          Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImlhdCI6MTYwMDAwMDAwMCwiZXhwIjoxNjAwMDAwMDAwfQ.invalid'
        }
      });

      expect(expiredTokenResponse.status).toBe(401);

      // Test without token
      const noTokenResponse = await ServerTestHelper.makeRequest({
        method: 'GET',
        url: '/api/auth/profile'
      });

      E2ETestHelper.validateErrorResponse(noTokenResponse, 401, 'Authorization header is required');
    });

    it('should handle concurrent authentication requests', async () => {
      // Setup: Create multiple users for concurrent testing with slight delay to avoid rate limiting
      const timestamp = Date.now();
      const users = [];
      
      // Create users sequentially with small delay to avoid overwhelming rate limits
      for (let i = 0; i < 5; i++) {
        const userData = {
          username: `e2e_concurrent_user_${timestamp}_${i}`,
          email: `concurrent_${timestamp}_${i}@e2e.test`,
          password: 'Password123!'
        };
        await E2ETestHelper.createTestUser(userData);
        users.push(userData);
        
        // Small delay between user creations to spread out rate limiting
        if (i < 4) await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Make multiple concurrent login requests with different users
      const loginPromises = users.map(userData =>
        ServerTestHelper.makeRequest({
          method: 'POST',
          url: '/api/auth/login',
          data: {
            username: userData.username,
            password: userData.password
          }
        })
      );

      const responses = await Promise.all(loginPromises);

      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.data.data.token).toBeDefined();
      });

      // All tokens should be valid
      const profilePromises = responses.map(response =>
        E2ETestHelper.makeAuthenticatedRequest({
          method: 'GET',
          url: '/api/auth/profile'
        }, response.data.data.token)
      );

      const profileResponses = await Promise.all(profilePromises);
      profileResponses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });
});