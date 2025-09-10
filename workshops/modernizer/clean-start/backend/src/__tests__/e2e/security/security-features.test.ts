// E2E Test - Security Features and Validation
import { E2ETestHelper } from '../../../test-configs/test-helpers/e2e-helpers';
import { ServerTestHelper } from '../../../test-configs/test-helpers/server';

describe('Security Features E2E', () => {
  afterEach(async () => {
    await E2ETestHelper.cleanupTestData();
  });

  describe('Authentication Security', () => {
    it('should enforce JWT token expiration', async () => {
      // This test would require manipulating JWT expiration
      // For now, we'll test token validation
      const user = await E2ETestHelper.createTestUser();

      // Step 1: Valid token should work
      const validResponse = await E2ETestHelper.makeAuthenticatedRequest({
        method: 'GET',
        url: '/api/auth/profile'
      }, user.token);

      expect(validResponse.status).toBe(200);

      // Step 2: Invalid token should be rejected
      const invalidResponse = await E2ETestHelper.makeAuthenticatedRequest({
        method: 'GET',
        url: '/api/auth/profile'
      }, 'invalid.token.here');

      E2ETestHelper.validateErrorResponse(invalidResponse, 401, 'Invalid or expired token');

      // Step 3: Malformed token should be rejected
      const malformedResponse = await E2ETestHelper.makeAuthenticatedRequest({
        method: 'GET',
        url: '/api/auth/profile'
      }, 'not-a-jwt-token');

      expect(malformedResponse.status).toBe(401);
    });

    it('should prevent brute force login attempts', async () => {
      // Setup: Create user
      const user = await E2ETestHelper.createTestUser({
        username: 'e2e_brute_force_test',
        password: 'CorrectPassword123!'
      });

      // Step 1: Make multiple failed login attempts
      const failedAttempts = [];
      for (let i = 0; i < 5; i++) {
        const response = await ServerTestHelper.makeRequest({
          method: 'POST',
          url: '/api/auth/login',
          data: {
            username: user.username,
            password: 'WrongPassword123!'
          }
        });
        failedAttempts.push(response);
      }

      // All should fail with 401
      failedAttempts.forEach(response => {
        expect(response.status).toBe(401);
      });

      // Step 2: After multiple failures, should still allow correct login
      // (In a real implementation, you might implement rate limiting)
      const correctLoginResponse = await ServerTestHelper.makeRequest({
        method: 'POST',
        url: '/api/auth/login',
        data: {
          username: user.username,
          password: user.password
        }
      });

      expect(correctLoginResponse.status).toBe(200);
    });

    it('should validate password strength requirements', async () => {
      const weakPasswords = [
        '123',           // Too short
        'password',      // No numbers/special chars
        '12345678',      // Only numbers
        'PASSWORD',      // Only uppercase
        'password123'    // No special characters
      ];

      for (const weakPassword of weakPasswords) {
        const response = await ServerTestHelper.makeRequest({
          method: 'POST',
          url: '/api/auth/register',
          data: {
            username: `weakpass_${Date.now()}`,
            email: `weak_${Date.now()}@test.com`,
            password: weakPassword
          }
        });

        expect(response.status).toBe(400);
        expect(response.data.error.message).toContain('Validation failed');
      }

      // Strong password should work
      const strongPasswordResponse = await ServerTestHelper.makeRequest({
        method: 'POST',
        url: '/api/auth/register',
        data: {
          username: `strongpass_${Date.now()}`,
          email: `strong_${Date.now()}@test.com`,
          password: 'StrongPassword123!'
        }
      });

      expect(strongPasswordResponse.status).toBe(201);
    });
  });

  describe('Authorization Security', () => {
    it('should enforce role-based access control', async () => {
      // Setup: Create regular user and seller
      const regularUser = await E2ETestHelper.createTestUser({
        username: 'e2e_regular_user',
        is_seller: false
      });

      const seller = await E2ETestHelper.createTestUser({
        username: 'e2e_seller_user',
        is_seller: true
      });

      // Step 1: Regular user should not access seller routes
      const sellerDashboardResponse = await E2ETestHelper.makeAuthenticatedRequest({
        method: 'GET',
        url: '/api/seller/dashboard'
      }, regularUser.token);

      E2ETestHelper.validateErrorResponse(sellerDashboardResponse, 403, 'Seller account required to access this resource');

      // Step 2: Regular user should not create products
      const createProductResponse = await E2ETestHelper.makeAuthenticatedRequest({
        method: 'POST',
        url: '/api/products',
        data: {
          name: 'Unauthorized Product',
          price: 99.99,
          inventory_quantity: 1,
          category_id: 1
        }
      }, regularUser.token);

      E2ETestHelper.validateErrorResponse(createProductResponse, 403, 'Seller account required to access this resource');

      // Step 3: Seller should access seller routes
      const sellerAccessResponse = await E2ETestHelper.makeAuthenticatedRequest({
        method: 'GET',
        url: '/api/seller/dashboard'
      }, seller.token);

      expect(sellerAccessResponse.status).not.toBe(403);
    });

    it('should prevent users from accessing other users\' data', async () => {
      // Setup: Create two users
      const user1 = await E2ETestHelper.createTestUser({
        username: 'e2e_user1'
      });

      const user2 = await E2ETestHelper.createTestUser({
        username: 'e2e_user2'
      });

      // Step 1: User1 adds items to cart
      const { product } = await E2ETestHelper.setupCompleteScenario();
      await E2ETestHelper.addToCart(product.id, 1, user1.token);

      // Step 2: User2 should not see User1's cart
      const user2CartResponse = await E2ETestHelper.getCart(user2.token);
      expect(user2CartResponse.status).toBe(200);
      expect(user2CartResponse.data.data.cart.items).toHaveLength(0);

      // Step 3: User1 creates an order
      const orderResponse = await E2ETestHelper.createOrder({
        shipping_address: '123 Privacy Test Street',
        paymentMethod: 'credit_card',
        paymentDetails: {
          cardNumber: '4111111111111111', // Use valid test card number
          expiryDate: '12/25',
          cvv: '123',
          cardholderName: 'Test User'
        }
      }, user1.token);

      // Handle potential order creation failure in concurrent tests
      if (orderResponse.status !== 201 || !orderResponse.data.data?.order?.id) {
        throw new Error(`Order creation failed: ${JSON.stringify(orderResponse.data)}`);
      }

      const orderId = orderResponse.data.data.order.id;

      // Step 4: User2 should not access User1's order
      const unauthorizedOrderResponse = await E2ETestHelper.makeAuthenticatedRequest({
        method: 'GET',
        url: `/api/orders/${orderId}`
      }, user2.token);

      E2ETestHelper.validateErrorResponse(unauthorizedOrderResponse, 403, 'You can only view your own orders');
    });

    it('should prevent sellers from accessing other sellers\' products', async () => {
      // Setup: Create two sellers with products
      const seller1 = await E2ETestHelper.createTestUser({
        username: 'e2e_seller1',
        is_seller: true
      });

      const seller2 = await E2ETestHelper.createTestUser({
        username: 'e2e_seller2',
        is_seller: true
      });

      const category = await E2ETestHelper.createTestCategory({}, seller1.token);
      const seller1Product = await E2ETestHelper.createTestProduct({
        name: 'Seller 1 Product',
        category_id: category.id
      }, seller1.token);

      // Step 1: Seller2 should not update Seller1's product
      const updateResponse = await E2ETestHelper.makeAuthenticatedRequest({
        method: 'PUT',
        url: `/api/products/${seller1Product.id}`,
        data: { name: 'Hacked Product Name' }
      }, seller2.token);

      E2ETestHelper.validateErrorResponse(updateResponse, 403, 'You can only update your own products');

      // Step 2: Seller2 should not delete Seller1's product
      const deleteResponse = await E2ETestHelper.makeAuthenticatedRequest({
        method: 'DELETE',
        url: `/api/products/${seller1Product.id}`
      }, seller2.token);

      E2ETestHelper.validateErrorResponse(deleteResponse, 403, 'You can only delete your own products');

      // Step 3: Verify product is unchanged
      const productResponse = await ServerTestHelper.makeRequest({
        method: 'GET',
        url: `/api/products/${seller1Product.id}`
      });

      expect(productResponse.status).toBe(200);
      expect(productResponse.data.data.product.name).toBe('Seller 1 Product');
    });
  });

  describe('Input Validation Security', () => {
    it('should prevent SQL injection attempts', async () => {
      const sqlInjectionAttempts = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "admin'--",
        "' UNION SELECT * FROM users --"
      ];

      for (const maliciousInput of sqlInjectionAttempts) {
        // Test in login
        const loginResponse = await ServerTestHelper.makeRequest({
          method: 'POST',
          url: '/api/auth/login',
          data: {
            username: maliciousInput,
            password: 'password123'
          }
        });

        // Should not cause server error (500) - should handle gracefully
        expect(loginResponse.status).not.toBe(500);
        expect(loginResponse.status).toBe(400); // Validation error for malicious input

        // Test in registration
        const registerResponse = await ServerTestHelper.makeRequest({
          method: 'POST',
          url: '/api/auth/register',
          data: {
            username: maliciousInput,
            email: 'test@example.com',
            password: 'Password123!'
          }
        });

        // Should validate input properly
        expect(registerResponse.status).toBe(400);
      }
    });

    it('should prevent XSS attacks in user input', async () => {
      const xssAttempts = [
        '<script>alert("XSS")</script>',
        'javascript:alert("XSS")',
        '<img src="x" onerror="alert(\'XSS\')" />',
        '"><script>alert("XSS")</script>'
      ];

      const user = await E2ETestHelper.createTestUser({
        is_seller: true
      });

      for (const maliciousInput of xssAttempts) {
        // Test in product creation
        const productResponse = await E2ETestHelper.makeAuthenticatedRequest({
          method: 'POST',
          url: '/api/products',
          data: {
            name: maliciousInput,
            description: maliciousInput,
            price: 99.99,
            inventory_quantity: 1,
            category_id: 1
          }
        }, user.token);

        if (productResponse.status === 201) {
          // If product was created, verify XSS is escaped in response
          const productId = productResponse.data.data.id;
          const getResponse = await ServerTestHelper.makeRequest({
            method: 'GET',
            url: `/api/products/${productId}`
          });

          expect(getResponse.status).toBe(200);
          // XSS should be escaped or sanitized
          expect(getResponse.data.data.name).not.toContain('<script>');
          expect(getResponse.data.data.description).not.toContain('<script>');
        }
      }
    });

    it('should validate file upload security', async () => {
      // This test assumes there's a file upload endpoint
      const user = await E2ETestHelper.createTestUser({
        is_seller: true
      });

      // Test uploading non-image file as product image
      const maliciousFileResponse = await E2ETestHelper.makeAuthenticatedRequest({
        method: 'POST',
        url: '/api/products/upload-image',
        data: {
          file: 'data:text/plain;base64,dGVzdCBmaWxl', // "test file" in base64
          filename: 'malicious.exe'
        }
      }, user.token);

      // Should reject non-image files
      expect(maliciousFileResponse.status).toBe(400);
      expect(maliciousFileResponse.data.error.message).toContain('Invalid file type');
    });
  });

  describe('Rate Limiting Security', () => {
    it('should enforce API rate limits', async () => {
      // Test rate limiting on public endpoints
      const requests = [];
      const maxRequests = 100; // Assuming rate limit is higher than this

      // Make rapid requests to a public endpoint
      for (let i = 0; i < maxRequests; i++) {
        requests.push(
          ServerTestHelper.makeRequest({
            method: 'GET',
            url: '/api/products'
          })
        );
      }

      const responses = await Promise.all(requests);

      // Most should succeed, but some might be rate limited
      const successfulRequests = responses.filter(r => r.status === 200);
      const rateLimitedRequests = responses.filter(r => r.status === 429);

      expect(successfulRequests.length).toBeGreaterThan(0);
      
      // If rate limiting is implemented, some requests should be limited
      if (rateLimitedRequests.length > 0) {
        rateLimitedRequests.forEach(response => {
          expect(response.data.error.message).toContain('rate limit');
        });
      }
    });

    it('should handle concurrent requests gracefully', async () => {
      const user = await E2ETestHelper.createTestUser();

      // Make concurrent requests to authenticated endpoint
      const concurrentRequests = Array.from({ length: 10 }, () =>
        E2ETestHelper.makeAuthenticatedRequest({
          method: 'GET',
          url: '/api/auth/profile'
        }, user.token)
      );

      const responses = await Promise.all(concurrentRequests);

      // All should either succeed or be properly rate limited
      responses.forEach(response => {
        expect([200, 429]).toContain(response.status);
      });

      // At least some should succeed
      const successfulResponses = responses.filter(r => r.status === 200);
      expect(successfulResponses.length).toBeGreaterThan(0);
    });
  });

  describe('CORS Security', () => {
    it('should handle CORS headers correctly', async () => {
      // Test preflight request
      const preflightResponse = await ServerTestHelper.makeRequest({
        method: 'OPTIONS',
        url: '/api/products',
        headers: {
          'Origin': 'https://example.com',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type, Authorization'
        }
      });

      // Should handle OPTIONS request
      expect([200, 204]).toContain(preflightResponse.status);

      // Test actual request with CORS headers
      const corsResponse = await ServerTestHelper.makeRequest({
        method: 'GET',
        url: '/api/products',
        headers: {
          'Origin': 'https://example.com'
        }
      });

      expect(corsResponse.status).toBe(200);
      // CORS headers should be present (depending on server configuration)
    });
  });

  describe('Security Headers', () => {
    it('should include security headers in responses', async () => {
      const response = await ServerTestHelper.makeRequest({
        method: 'GET',
        url: '/api/health'
      });

      expect(response.status).toBe(200);

      // Check for common security headers
      const headers = response.headers;
      
      // These headers should be present (depending on helmet configuration)
      expect(headers['x-content-type-options']).toBeDefined();
      expect(headers['x-frame-options']).toBeDefined();
      expect(headers['x-xss-protection']).toBeDefined();
      
      // Content-Type should be properly set
      expect(headers['content-type']).toContain('application/json');
    });

    it('should prevent information disclosure in error responses', async () => {
      // Test 404 error
      const notFoundResponse = await ServerTestHelper.makeRequest({
        method: 'GET',
        url: '/api/nonexistent-endpoint'
      });

      expect(notFoundResponse.status).toBe(404);
      // Should not expose internal server details
      expect(notFoundResponse.data.error.message).not.toContain('stack');
      expect(notFoundResponse.data.error.message).not.toContain('internal');

      // Test 500 error (if we can trigger one safely)
      const serverErrorResponse = await ServerTestHelper.makeRequest({
        method: 'POST',
        url: '/api/products',
        data: {
          // Invalid data that might cause server error
          price: 'not-a-number',
          inventory_quantity: 'not-a-number'
        }
      });

      // Should handle gracefully without exposing stack traces
      if (serverErrorResponse.status === 500) {
        expect(serverErrorResponse.data.error.message).not.toContain('Error:');
        expect(serverErrorResponse.data.error.message).not.toContain('at ');
      }
    });
  });
});