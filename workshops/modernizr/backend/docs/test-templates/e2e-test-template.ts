/**
 * End-to-End (E2E) Test Template
 * 
 * Use this template for testing complete user workflows from start to finish.
 * E2E tests use real server, real database, and real HTTP requests to simulate user interactions.
 */

import { E2ETestHelper } from '../test-configs/test-helpers/e2e';
import { DatabaseTestHelper } from '../test-configs/test-helpers/database';

// Mock only truly external services (payment gateways, email services, etc.)
jest.mock('../services/PaymentGateway', () => ({
  PaymentGateway: {
    processPayment: jest.fn().mockResolvedValue({
      success: true,
      transactionId: 'test-transaction-123'
    })
  }
}));

jest.mock('../services/EmailService', () => ({
  EmailService: {
    sendEmail: jest.fn().mockResolvedValue(true)
  }
}));

describe('User Workflow E2E Tests', () => {
  let serverUrl: string;

  beforeAll(async () => {
    // Start test server
    serverUrl = await E2ETestHelper.startTestServer();
  });

  afterAll(async () => {
    // Stop test server
    await E2ETestHelper.stopTestServer();
  });

  beforeEach(async () => {
    // Set up fresh test database for each test
    await DatabaseTestHelper.setupTestDatabase();
    
    // Reset external service mocks
    jest.clearAllMocks();
  });

  afterEach(async () => {
    // Clean up test database after each test
    await DatabaseTestHelper.cleanupTestDatabase();
  });

  describe('Complete User Registration and Shopping Workflow', () => {
    it('should complete full user journey from registration to purchase', async () => {
      // Step 1: User Registration
      const userData = {
        username: 'e2euser',
        email: 'e2e@test.com',
        password: 'SecurePass123!',
        first_name: 'E2E',
        last_name: 'User'
      };

      const registerResponse = await E2ETestHelper.makeRequest({
        method: 'POST',
        url: `${serverUrl}/api/auth/register`,
        data: userData
      });

      expect(registerResponse.status).toBe(201);
      expect(registerResponse.data.data.user.username).toBe(userData.username);
      const userToken = registerResponse.data.data.token;

      // Step 2: User Login (verify registration worked)
      const loginResponse = await E2ETestHelper.makeRequest({
        method: 'POST',
        url: `${serverUrl}/api/auth/login`,
        data: {
          username: userData.username,
          password: userData.password
        }
      });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.data.data.token).toBeDefined();

      // Step 3: Upgrade to Seller
      const upgradeResponse = await E2ETestHelper.makeAuthenticatedRequest({
        method: 'POST',
        url: `${serverUrl}/api/auth/upgrade-to-seller`
      }, userToken);

      expect(upgradeResponse.status).toBe(200);
      expect(upgradeResponse.data.data.user.is_seller).toBe(true);

      // Step 4: Create Product Category
      const categoryData = {
        name: 'E2E Test Category',
        description: 'Category for E2E testing'
      };

      const categoryResponse = await E2ETestHelper.makeAuthenticatedRequest({
        method: 'POST',
        url: `${serverUrl}/api/categories`,
        data: categoryData
      }, userToken);

      expect(categoryResponse.status).toBe(201);
      const categoryId = categoryResponse.data.data.category.id;

      // Step 5: Create Product
      const productData = {
        name: 'E2E Test Product',
        description: 'Product for E2E testing',
        price: 29.99,
        category_id: categoryId,
        inventory_quantity: 10
      };

      const productResponse = await E2ETestHelper.makeAuthenticatedRequest({
        method: 'POST',
        url: `${serverUrl}/api/products`,
        data: productData
      }, userToken);

      expect(productResponse.status).toBe(201);
      const productId = productResponse.data.data.product.id;

      // Step 6: Create Second User (Customer)
      const customerData = {
        username: 'e2ecustomer',
        email: 'customer@test.com',
        password: 'CustomerPass123!',
        first_name: 'Customer',
        last_name: 'User'
      };

      const customerRegisterResponse = await E2ETestHelper.makeRequest({
        method: 'POST',
        url: `${serverUrl}/api/auth/register`,
        data: customerData
      });

      expect(customerRegisterResponse.status).toBe(201);
      const customerToken = customerRegisterResponse.data.data.token;

      // Step 7: Browse Products
      const productsResponse = await E2ETestHelper.makeRequest({
        method: 'GET',
        url: `${serverUrl}/api/products`
      });

      expect(productsResponse.status).toBe(200);
      expect(productsResponse.data.data.products).toHaveLength(1);
      expect(productsResponse.data.data.products[0].name).toBe(productData.name);

      // Step 8: Add Product to Cart
      const addToCartResponse = await E2ETestHelper.makeAuthenticatedRequest({
        method: 'POST',
        url: `${serverUrl}/api/cart/items`,
        data: {
          productId: productId,
          quantity: 2
        }
      }, customerToken);

      expect(addToCartResponse.status).toBe(201);

      // Step 9: View Cart
      const cartResponse = await E2ETestHelper.makeAuthenticatedRequest({
        method: 'GET',
        url: `${serverUrl}/api/cart`
      }, customerToken);

      expect(cartResponse.status).toBe(200);
      expect(cartResponse.data.data.items).toHaveLength(1);
      expect(cartResponse.data.data.items[0].quantity).toBe(2);
      expect(cartResponse.data.data.total).toBe(59.98); // 29.99 * 2

      // Step 10: Checkout and Create Order
      const checkoutResponse = await E2ETestHelper.makeAuthenticatedRequest({
        method: 'POST',
        url: `${serverUrl}/api/orders/checkout`,
        data: {
          paymentMethod: 'credit_card',
          paymentDetails: {
            cardNumber: '4111111111111111',
            expiryDate: '12/25',
            cvv: '123',
            cardholderName: 'Customer User'
          }
        }
      }, customerToken);

      expect(checkoutResponse.status).toBe(201);
      expect(checkoutResponse.data.data.order.status).toBe('pending');
      expect(checkoutResponse.data.data.order.total).toBe(59.98);
      const orderId = checkoutResponse.data.data.order.id;

      // Step 11: Verify Order Details
      const orderResponse = await E2ETestHelper.makeAuthenticatedRequest({
        method: 'GET',
        url: `${serverUrl}/api/orders/${orderId}`
      }, customerToken);

      expect(orderResponse.status).toBe(200);
      expect(orderResponse.data.data.order.items).toHaveLength(1);
      expect(orderResponse.data.data.order.items[0].product_name).toBe(productData.name);

      // Step 12: Verify Inventory Updated
      const updatedProductResponse = await E2ETestHelper.makeRequest({
        method: 'GET',
        url: `${serverUrl}/api/products/${productId}`
      });

      expect(updatedProductResponse.status).toBe(200);
      expect(updatedProductResponse.data.data.product.inventory_quantity).toBe(8); // 10 - 2

      // Step 13: Verify Cart is Empty After Checkout
      const emptyCartResponse = await E2ETestHelper.makeAuthenticatedRequest({
        method: 'GET',
        url: `${serverUrl}/api/cart`
      }, customerToken);

      expect(emptyCartResponse.status).toBe(200);
      expect(emptyCartResponse.data.data.items).toHaveLength(0);
      expect(emptyCartResponse.data.data.total).toBe(0);
    });
  });

  describe('Authentication Security Workflow', () => {
    it('should enforce authentication and authorization correctly', async () => {
      // Step 1: Try to access protected resource without token
      const unauthorizedResponse = await E2ETestHelper.makeRequest({
        method: 'GET',
        url: `${serverUrl}/api/auth/profile`
      });

      expect(unauthorizedResponse.status).toBe(401);
      expect(unauthorizedResponse.data.error).toBe('No token provided');

      // Step 2: Try to access protected resource with invalid token
      const invalidTokenResponse = await E2ETestHelper.makeRequest({
        method: 'GET',
        url: `${serverUrl}/api/auth/profile`,
        headers: {
          'Authorization': 'Bearer invalid.jwt.token'
        }
      });

      expect(invalidTokenResponse.status).toBe(401);
      expect(invalidTokenResponse.data.error).toBe('Invalid token');

      // Step 3: Register and get valid token
      const userData = {
        username: 'authuser',
        email: 'auth@test.com',
        password: 'AuthPass123!'
      };

      const registerResponse = await E2ETestHelper.makeRequest({
        method: 'POST',
        url: `${serverUrl}/api/auth/register`,
        data: userData
      });

      expect(registerResponse.status).toBe(201);
      const validToken = registerResponse.data.data.token;

      // Step 4: Access protected resource with valid token
      const authorizedResponse = await E2ETestHelper.makeAuthenticatedRequest({
        method: 'GET',
        url: `${serverUrl}/api/auth/profile`
      }, validToken);

      expect(authorizedResponse.status).toBe(200);
      expect(authorizedResponse.data.data.user.username).toBe(userData.username);

      // Step 5: Try to access seller-only resource as regular user
      const sellerOnlyResponse = await E2ETestHelper.makeAuthenticatedRequest({
        method: 'POST',
        url: `${serverUrl}/api/products`,
        data: {
          name: 'Test Product',
          price: 10.00,
          category_id: 1,
          inventory_quantity: 5
        }
      }, validToken);

      expect(sellerOnlyResponse.status).toBe(403);
      expect(sellerOnlyResponse.data.error).toBe('Seller access required');
    });
  });

  describe('Error Handling Workflow', () => {
    it('should handle various error scenarios gracefully', async () => {
      // Step 1: Invalid registration data
      const invalidUserData = {
        username: '', // Invalid: empty username
        email: 'invalid-email', // Invalid: malformed email
        password: '123' // Invalid: too short
      };

      const invalidRegisterResponse = await E2ETestHelper.makeRequest({
        method: 'POST',
        url: `${serverUrl}/api/auth/register`,
        data: invalidUserData
      });

      expect(invalidRegisterResponse.status).toBe(400);
      expect(invalidRegisterResponse.data.error).toBe('Validation failed');

      // Step 2: Duplicate user registration
      const validUserData = {
        username: 'duplicateuser',
        email: 'duplicate@test.com',
        password: 'ValidPass123!'
      };

      // First registration should succeed
      const firstRegisterResponse = await E2ETestHelper.makeRequest({
        method: 'POST',
        url: `${serverUrl}/api/auth/register`,
        data: validUserData
      });

      expect(firstRegisterResponse.status).toBe(201);

      // Second registration should fail
      const duplicateRegisterResponse = await E2ETestHelper.makeRequest({
        method: 'POST',
        url: `${serverUrl}/api/auth/register`,
        data: validUserData
      });

      expect(duplicateRegisterResponse.status).toBe(409);
      expect(duplicateRegisterResponse.data.error).toBe('Username already exists');

      // Step 3: Invalid login credentials
      const invalidLoginResponse = await E2ETestHelper.makeRequest({
        method: 'POST',
        url: `${serverUrl}/api/auth/login`,
        data: {
          username: validUserData.username,
          password: 'wrongpassword'
        }
      });

      expect(invalidLoginResponse.status).toBe(401);
      expect(invalidLoginResponse.data.error).toBe('Invalid username or password');

      // Step 4: Access non-existent resource
      const notFoundResponse = await E2ETestHelper.makeRequest({
        method: 'GET',
        url: `${serverUrl}/api/products/99999`
      });

      expect(notFoundResponse.status).toBe(404);
      expect(notFoundResponse.data.error).toBe('Product not found');
    });
  });

  describe('Performance and Rate Limiting Workflow', () => {
    it('should enforce rate limiting correctly', async () => {
      const requests = [];
      
      // Make multiple rapid requests to trigger rate limiting
      for (let i = 0; i < 10; i++) {
        requests.push(
          E2ETestHelper.makeRequest({
            method: 'POST',
            url: `${serverUrl}/api/auth/login`,
            data: {
              username: 'nonexistent',
              password: 'wrongpassword'
            }
          })
        );
      }

      const responses = await Promise.all(requests);

      // First few requests should return 401 (invalid credentials)
      const unauthorizedResponses = responses.filter(r => r.status === 401);
      expect(unauthorizedResponses.length).toBeGreaterThan(0);

      // Some requests should be rate limited (429)
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);

      // Rate limited responses should have appropriate headers
      const rateLimitedResponse = rateLimitedResponses[0];
      expect(rateLimitedResponse.data.error).toBe('Too many requests');
    });
  });
});

/**
 * E2E Test Checklist:
 * 
 * ✅ Real server is started and stopped properly
 * ✅ Real database is used with proper setup/cleanup
 * ✅ Complete user workflows are tested end-to-end
 * ✅ HTTP requests and responses are tested
 * ✅ Authentication and authorization flows are verified
 * ✅ Error handling scenarios are covered
 * ✅ Security features (rate limiting, validation) are tested
 * ✅ Only external services are mocked
 * ✅ Tests simulate real user interactions
 * ✅ Tests complete within reasonable time (< 120 seconds total)
 * ✅ Database state is verified after operations
 * ✅ Edge cases and error conditions are tested
 */