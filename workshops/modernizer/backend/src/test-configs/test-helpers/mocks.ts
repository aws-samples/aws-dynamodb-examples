// Mock Factory - Create Test Data and Mocked Dependencies
import { User } from '../../models/User';
import { Product } from '../../models/Product';
import { Category } from '../../models/Category';
import { Order } from '../../models/Order';

export class MockFactory {
  /**
   * Create mock user with default values
   */
  static createMockUser(overrides: Partial<User> = {}): User {
    return {
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      password_hash: '$2b$10$test.hash.for.testing.purposes.only',
      first_name: 'Test',
      last_name: 'User',
      is_seller: false,
      super_admin: false,
      created_at: new Date('2025-01-01T00:00:00Z'),
      updated_at: new Date('2025-01-01T00:00:00Z'),
      ...overrides
    };
  }

  /**
   * Create mock seller user
   */
  static createMockSeller(overrides: Partial<User> = {}): User {
    return this.createMockUser({
      id: 2,
      username: 'testseller',
      email: 'seller@example.com',
      is_seller: true,
      ...overrides
    });
  }

  /**
   * Create mock product with default values
   */
  static createMockProduct(overrides: Partial<Product> = {}): Product {
    return {
      id: 1,
      name: 'Test Product',
      description: 'Test product description',
      price: 99.99,
      inventory_quantity: 10,
      category_id: 1,
      seller_id: 2,
      created_at: new Date('2025-01-01T00:00:00Z'),
      updated_at: new Date('2025-01-01T00:00:00Z'),
      ...overrides
    };
  }

  /**
   * Create mock category with default values
   */
  static createMockCategory(overrides: Partial<Category> = {}): Category {
    return {
      id: 1,
      name: 'Test Category',
      parent_id: undefined,
      created_at: new Date('2025-01-01T00:00:00Z'),
      ...overrides
    };
  }

  /**
   * Create mock order with default values
   */
  static createMockOrder(overrides: Partial<Order> = {}): Order {
    return {
      id: 1,
      user_id: 1,
      total_amount: 99.99,
      status: 'pending',
      created_at: new Date('2025-01-01T00:00:00Z'),
      updated_at: new Date('2025-01-01T00:00:00Z'),
      ...overrides
    };
  }

  /**
   * Create fully mocked repository with jest mocks
   */
  static createMockRepository<T>(): jest.Mocked<T> {
    return {} as jest.Mocked<T>;
  }

  /**
   * Create mock database pool
   */
  static createMockPool() {
    return {
      execute: jest.fn(),
      getConnection: jest.fn(),
      end: jest.fn(),
      query: jest.fn()
    };
  }

  /**
   * Create mock JWT token
   */
  static createMockJWTToken(payload: any = { userId: 1 }): string {
    // This is a mock token for testing - not a real JWT
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
    const payloadStr = Buffer.from(JSON.stringify(payload)).toString('base64');
    const signature = 'mock-signature';
    
    return `${header}.${payloadStr}.${signature}`;
  }

  /**
   * Create mock HTTP request object
   */
  static createMockRequest(overrides: any = {}) {
    return {
      body: {},
      params: {},
      query: {},
      headers: {},
      user: null,
      ...overrides
    };
  }

  /**
   * Create mock HTTP response object
   */
  static createMockResponse() {
    const res: any = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis(),
      clearCookie: jest.fn().mockReturnThis()
    };
    return res;
  }

  /**
   * Create mock Next function for middleware testing
   */
  static createMockNext() {
    return jest.fn();
  }

  /**
   * Create array of mock items
   */
  static createMockArray<T>(factory: () => T, count: number = 3): T[] {
    return Array.from({ length: count }, (_, index) => factory());
  }

  /**
   * Create mock pagination result
   */
  static createMockPaginationResult<T>(items: T[], page: number = 1, limit: number = 10) {
    return {
      items,
      pagination: {
        page,
        limit,
        total: items.length,
        totalPages: Math.ceil(items.length / limit),
        hasNext: page * limit < items.length,
        hasPrev: page > 1
      }
    };
  }
}