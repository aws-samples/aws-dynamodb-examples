// E2E Test Helpers - Enhanced utilities for end-to-end testing
import { ServerTestHelper, RequestOptions, Response } from './server';
import { DatabaseTestHelper } from './database';
import { TestReliabilityHelper, HttpReliabilityHelper } from './reliability';

export interface AuthTokens {
  userToken: string;
  sellerToken: string;
  adminToken?: string;
}

export interface TestUser {
  id: number;
  username: string;
  email: string;
  password: string;
  token: string;
  is_seller: boolean;
}

export interface TestProduct {
  id: number;
  name: string;
  price: number;
  category_id: number;
  seller_id: number;
  inventory_quantity: number;
}

export interface TestCategory {
  id: number;
  name: string;
  parent_id?: number;
}

export class E2ETestHelper {
  private static testUsers: TestUser[] = [];
  private static testProducts: TestProduct[] = [];
  private static testCategories: TestCategory[] = [];

  /**
   * Create a test user with authentication
   */
  static async createTestUser(userData: {
    username?: string;
    email?: string;
    password?: string;
    first_name?: string;
    last_name?: string;
    is_seller?: boolean;
  } = {}): Promise<TestUser> {
    const timestamp = Date.now() + Math.floor(Math.random() * 1000);
    const defaultUser = {
      username: `e2e_user_${timestamp}`,
      email: `e2e_${timestamp}@test.com`,
      password: 'TestPassword123!',
      first_name: 'E2E',
      last_name: 'User',
      is_seller: false,
      ...userData
    };

    // Register user (without is_seller field)
    const registrationData = {
      username: defaultUser.username,
      email: defaultUser.email,
      password: defaultUser.password,
      first_name: defaultUser.first_name,
      last_name: defaultUser.last_name
    };

    const response = await this.makeRequest({
      method: 'POST',
      url: '/api/auth/register',
      data: registrationData
    });

    if (response.status !== 201) {
      throw new Error(`Failed to create test user: ${JSON.stringify(response.data)}`);
    }

    const testUser: TestUser = {
      id: response.data.data.user.id,
      username: defaultUser.username,
      email: defaultUser.email,
      password: defaultUser.password,
      token: response.data.data.token,
      is_seller: false // Start as false, will be upgraded if needed
    };

    // Upgrade to seller if requested
    if (defaultUser.is_seller) {
      const upgradeResponse = await this.makeAuthenticatedRequest({
        method: 'POST',
        url: '/api/auth/upgrade-seller'
      }, testUser.token);

      if (upgradeResponse.status !== 200) {
        throw new Error(`Failed to upgrade user to seller: ${JSON.stringify(upgradeResponse.data)}`);
      }

      testUser.is_seller = true;
    }

    this.testUsers.push(testUser);
    return testUser;
  }

  /**
   * Login with existing user credentials
   */
  static async loginUser(username: string, password: string): Promise<TestUser> {
    const response = await this.makeRequest({
      method: 'POST',
      url: '/api/auth/login',
      data: { username, password }
    });

    if (response.status !== 200) {
      throw new Error(`Failed to login user: ${JSON.stringify(response.data)}`);
    }

    const testUser: TestUser = {
      id: response.data.data.user.id,
      username: response.data.data.user.username,
      email: response.data.data.user.email,
      password,
      token: response.data.data.token,
      is_seller: response.data.data.user.is_seller
    };

    return testUser;
  }

  /**
   * Create a test category
   */
  static async createTestCategory(categoryData: {
    name?: string;
    parent_id?: number;
  } = {}, authToken?: string): Promise<TestCategory> {
    const timestamp = Date.now();
    const defaultCategory = {
      name: `E2E Category ${timestamp}`,
      ...categoryData
    };

    const headers: Record<string, string> = {};
    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }

    const response = await this.makeRequest({
      method: 'POST',
      url: '/api/categories',
      data: defaultCategory,
      headers
    });

    if (response.status !== 201) {
      throw new Error(`Failed to create test category: ${JSON.stringify(response.data)}`);
    }

    const testCategory: TestCategory = {
      id: response.data.data.category.id,
      name: response.data.data.category.name,
      parent_id: response.data.data.category.parent_id
    };

    this.testCategories.push(testCategory);
    return testCategory;
  }

  /**
   * Create a test product
   */
  static async createTestProduct(productData: {
    name?: string;
    description?: string;
    price?: number;
    inventory_quantity?: number;
    category_id?: number;
  } = {}, sellerToken: string): Promise<TestProduct> {
    const timestamp = Date.now();
    
    // Create a category if none provided
    let categoryId = productData.category_id;
    if (!categoryId) {
      const category = await this.createTestCategory({}, sellerToken);
      categoryId = category.id;
    }

    const defaultProduct = {
      name: `E2E Product ${timestamp}`,
      description: `Test product created for E2E testing at ${new Date().toISOString()}`,
      price: 99.99,
      inventory_quantity: 10,
      category_id: categoryId,
      ...productData
    };

    const response = await this.makeRequest({
      method: 'POST',
      url: '/api/products',
      data: defaultProduct,
      headers: {
        Authorization: `Bearer ${sellerToken}`
      }
    });

    if (response.status !== 201) {
      throw new Error(`Failed to create test product: ${JSON.stringify(response.data)}`);
    }

    const testProduct: TestProduct = {
      id: response.data.data.product.id,
      name: response.data.data.product.name,
      price: response.data.data.product.price,
      category_id: response.data.data.product.category_id,
      seller_id: response.data.data.product.seller_id,
      inventory_quantity: response.data.data.product.inventory_quantity
    };

    this.testProducts.push(testProduct);
    return testProduct;
  }

  /**
   * Make authenticated request with reliability improvements
   */
  static async makeAuthenticatedRequest(
    options: RequestOptions,
    token: string
  ): Promise<Response> {
    return HttpReliabilityHelper.reliableRequest(
      () => ServerTestHelper.makeRequest({
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${token}`
        }
      }),
      `${options.method} ${options.url}`
    );
  }

  /**
   * Make request with reliability improvements
   */
  static async makeRequest(options: RequestOptions): Promise<Response> {
    return HttpReliabilityHelper.reliableRequest(
      () => ServerTestHelper.makeRequest(options),
      `${options.method} ${options.url}`
    );
  }

  /**
   * Add product to cart
   */
  static async addToCart(
    productId: number,
    quantity: number,
    userToken: string
  ): Promise<Response> {
    return this.makeAuthenticatedRequest({
      method: 'POST',
      url: '/api/cart/items',
      data: { productId, quantity }
    }, userToken);
  }

  /**
   * Get user's cart
   */
  static async getCart(userToken: string): Promise<Response> {
    return this.makeAuthenticatedRequest({
      method: 'GET',
      url: '/api/cart'
    }, userToken);
  }

  /**
   * Create an order from cart
   */
  static async createOrder(
    orderData: {
      shipping_address: string;
      paymentMethod: string;
      paymentDetails?: {
        cardNumber?: string;
        expiryDate?: string;
        cvv?: string;
        cardholderName?: string;
      };
    },
    userToken: string
  ): Promise<Response> {
    return this.makeAuthenticatedRequest({
      method: 'POST',
      url: '/api/orders/checkout',
      data: orderData
    }, userToken);
  }

  /**
   * Get user's orders
   */
  static async getUserOrders(userToken: string): Promise<Response> {
    return this.makeAuthenticatedRequest({
      method: 'GET',
      url: '/api/orders'
    }, userToken);
  }

  /**
   * Search products
   */
  static async searchProducts(query: string): Promise<Response> {
    return this.makeRequest({
      method: 'GET',
      url: `/api/products/search?q=${encodeURIComponent(query)}`
    });
  }

  /**
   * Get products by category
   */
  static async getProductsByCategory(categoryId: number): Promise<Response> {
    return this.makeRequest({
      method: 'GET',
      url: `/api/products?category=${categoryId}`
    });
  }

  /**
   * Wait for a condition to be met (polling)
   */
  static async waitFor(
    condition: () => Promise<boolean>,
    timeout: number = 10000,
    interval: number = 500
  ): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    
    throw new Error(`Condition not met within ${timeout}ms`);
  }

  /**
   * Clean up only cart and order data (preserve users and products)
   */
  static async cleanupCartData(): Promise<void> {
    try {
      // Only clean up cart and order data, preserve users and products
      await DatabaseTestHelper.cleanupCartAndOrderData();
    } catch (error) {
      console.warn('Warning during cart cleanup:', error);
      // Don't throw to avoid breaking test flow
    }
  }

  /**
   * Clean up all test data created during tests
   */
  static async cleanupTestData(): Promise<void> {
    try {
      // Use the database helper's cleanup method which handles all tables
      await DatabaseTestHelper.cleanupTestData();

      // Reset arrays
      this.testUsers = [];
      this.testProducts = [];
      this.testCategories = [];

    } catch (error) {
      console.warn('Warning during E2E test cleanup:', error);
      // Don't throw to avoid breaking test flow
    }
  }

  /**
   * Get all created test data for inspection
   */
  static getTestData() {
    return {
      users: this.testUsers,
      products: this.testProducts,
      categories: this.testCategories
    };
  }

  /**
   * Validate response structure
   */
  static validateResponse(
    response: Response,
    expectedStatus: number,
    expectedStructure?: any
  ): void {
    expect(response.status).toBe(expectedStatus);
    
    if (expectedStructure) {
      expect(response.data).toMatchObject(expectedStructure);
    }
  }

  /**
   * Validate error response
   */
  static validateErrorResponse(
    response: Response,
    expectedStatus: number,
    expectedMessage?: string
  ): void {
    expect(response.status).toBe(expectedStatus);
    expect(response.data.success).toBe(false);
    expect(response.data.error).toBeDefined();
    
    if (expectedMessage) {
      expect(response.data.error.message).toContain(expectedMessage);
    }
  }

  /**
   * Create a complete test scenario setup
   */
  static async setupCompleteScenario(): Promise<{
    user: TestUser;
    seller: TestUser;
    category: TestCategory;
    product: TestProduct;
  }> {
    // Create regular user
    const user = await this.createTestUser({
      username: 'e2e_buyer',
      email: 'buyer@e2e.test'
    });

    // Create seller user
    const seller = await this.createTestUser({
      username: 'e2e_seller',
      email: 'seller@e2e.test',
      is_seller: true
    });

    // Seller should already be upgraded by createTestUser
    if (!seller.is_seller) {
      throw new Error('Seller was not properly upgraded during user creation');
    }

    // Create category
    const category = await this.createTestCategory({
      name: 'E2E Test Electronics'
    }, seller.token);

    // Create product
    const product = await this.createTestProduct({
      name: 'E2E Test Laptop',
      description: 'High-performance laptop for testing',
      price: 1299.99,
      inventory_quantity: 5,
      category_id: category.id
    }, seller.token);

    return { user, seller, category, product };
  }

  /**
   * Setup complete scenario with unique usernames for each call
   */
  static async setupUniqueScenario(): Promise<{
    user: TestUser;
    seller: TestUser;
    category: TestCategory;
    product: TestProduct;
  }> {
    const timestamp = Date.now();
    
    // Create regular user with unique username
    const user = await this.createTestUser({
      username: `e2e_buyer_${timestamp}`,
      email: `buyer_${timestamp}@e2e.test`
    });

    // Small delay to avoid rate limiting when multiple tests run concurrently
    await new Promise(resolve => setTimeout(resolve, 25));

    // Create seller user with unique username
    const seller = await this.createTestUser({
      username: `e2e_seller_${timestamp}`,
      email: `seller_${timestamp}@e2e.test`,
      is_seller: true
    });

    // Seller should already be upgraded by createTestUser
    if (!seller.is_seller) {
      throw new Error('Seller was not properly upgraded during user creation');
    }

    // Create category
    const category = await this.createTestCategory({
      name: `E2E Test Electronics ${timestamp}`
    }, seller.token);

    // Create product
    const product = await this.createTestProduct({
      name: `E2E Test Laptop ${timestamp}`,
      description: 'High-performance laptop for testing',
      price: 1299.99,
      inventory_quantity: 10,
      category_id: category.id
    }, seller.token);

    return { user, seller, category, product };
  }

  /**
   * Simulate user workflow delay (for realistic E2E testing)
   */
  static async simulateUserDelay(minMs: number = 100, maxMs: number = 500): Promise<void> {
    const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Take screenshot (placeholder for future implementation)
   */
  static async takeScreenshot(testName: string): Promise<void> {
    // Placeholder for screenshot functionality
    console.log(`📸 Screenshot would be taken for: ${testName}`);
  }

  /**
   * Generate test report data
   */
  static generateTestReport(): {
    usersCreated: number;
    productsCreated: number;
    categoriesCreated: number;
    testData: any;
  } {
    return {
      usersCreated: this.testUsers.length,
      productsCreated: this.testProducts.length,
      categoriesCreated: this.testCategories.length,
      testData: this.getTestData()
    };
  }

  /**
   * Validate API response format
   */
  static validateApiResponseFormat(response: Response): void {
    expect(response.data).toHaveProperty('success');
    
    if (response.data.success) {
      expect(response.data).toHaveProperty('data');
    } else {
      expect(response.data).toHaveProperty('error');
      expect(response.data.error).toHaveProperty('message');
    }
  }

  /**
   * Create multiple test users for load testing
   */
  static async createMultipleTestUsers(count: number): Promise<TestUser[]> {
    const users: TestUser[] = [];
    
    for (let i = 0; i < count; i++) {
      const user = await this.createTestUser({
        username: `e2e_load_user_${i}`,
        email: `load_user_${i}@e2e.test`
      });
      users.push(user);
    }
    
    return users;
  }

  /**
   * Perform concurrent requests for load testing
   */
  static async performConcurrentRequests(
    requests: (() => Promise<Response>)[],
    maxConcurrency: number = 5
  ): Promise<Response[]> {
    const results: Response[] = [];
    
    for (let i = 0; i < requests.length; i += maxConcurrency) {
      const batch = requests.slice(i, i + maxConcurrency);
      const batchResults = await Promise.all(batch.map(req => req()));
      results.push(...batchResults);
    }
    
    return results;
  }

  /**
   * Measure response time
   */
  static async measureResponseTime<T>(
    operation: () => Promise<T>
  ): Promise<{ result: T; responseTime: number }> {
    const startTime = Date.now();
    const result = await operation();
    const responseTime = Date.now() - startTime;
    
    return { result, responseTime };
  }

  /**
   * Validate response time is within acceptable limits
   */
  static validateResponseTime(responseTime: number, maxMs: number = 5000): void {
    expect(responseTime).toBeLessThan(maxMs);
  }
}