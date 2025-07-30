import { AuthService } from '../../../services/AuthService';
import { pool } from '../../../config/database';
import { RowDataPacket } from 'mysql2';
import { isDatabaseAvailable } from '../../../test-configs/integration-setup';

const describeIfDB = isDatabaseAvailable() ? describe : describe.skip;

describeIfDB('AuthService Integration Tests', () => {
  let authService: AuthService;
  let testUserId: number | null = null;

  beforeAll(() => {
    authService = new AuthService();
  });

  afterAll(async () => {
    // Clean up any test data
    if (testUserId && isDatabaseAvailable()) {
      try {
        await pool.execute('DELETE FROM users WHERE id = ?', [testUserId]);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });

  beforeEach(async () => {
    if (isDatabaseAvailable()) {
      // Clean up any existing test users
      await pool.execute('DELETE FROM users WHERE username LIKE ?', ['test_integration_%']);
      await pool.execute('DELETE FROM users WHERE email LIKE ?', ['test_integration_%']);
    }
  });

  describe('User Registration Integration', () => {
    it('should register a new user and store in database', async () => {
      const userData = {
        username: 'test_integration_user',
        email: 'test_integration@example.com',
        password: 'password123',
        first_name: 'Test',
        last_name: 'User'
      };

      const result = await authService.register(userData);
      testUserId = result.user.id;

      // Verify user was created
      expect(result.user).toMatchObject({
        username: 'test_integration_user',
        email: 'test_integration@example.com',
        first_name: 'Test',
        last_name: 'User',
        is_seller: false
      });
      expect(result.token).toBeDefined();
      expect(typeof result.token).toBe('string');

      // Verify user exists in database
      const [rows] = await pool.execute(
        'SELECT * FROM users WHERE id = ?',
        [result.user.id]
      ) as [RowDataPacket[], any];

      expect(rows).toHaveLength(1);
      expect(rows[0].username).toBe('test_integration_user');
      expect(rows[0].email).toBe('test_integration@example.com');
      expect(rows[0].password_hash).not.toBe('password123'); // Should be hashed
    });

    it('should prevent duplicate username registration', async () => {
      const userData1 = {
        username: 'test_duplicate_user',
        email: 'test1@example.com',
        password: 'password123'
      };

      const userData2 = {
        username: 'test_duplicate_user', // Same username
        email: 'test2@example.com',
        password: 'password123'
      };

      // First registration should succeed
      const result1 = await authService.register(userData1);
      testUserId = result1.user.id;
      expect(result1.user.username).toBe('test_duplicate_user');

      // Second registration should fail
      await expect(authService.register(userData2))
        .rejects.toThrow('Username already exists');
    });
  });

  describe('User Login Integration', () => {
    beforeEach(async () => {
      // Create a test user for login tests
      const userData = {
        username: 'test_login_user',
        email: 'test_login@example.com',
        password: 'password123'
      };
      const result = await authService.register(userData);
      testUserId = result.user.id;
    });

    it('should login with valid credentials', async () => {
      const loginData = {
        username: 'test_login_user',
        password: 'password123'
      };

      const result = await authService.login(loginData);

      expect(result.user).toMatchObject({
        username: 'test_login_user',
        email: 'test_login@example.com'
      });
      expect(result.token).toBeDefined();
      expect(typeof result.token).toBe('string');
    });

    it('should reject login with invalid password', async () => {
      const loginData = {
        username: 'test_login_user',
        password: 'wrongpassword'
      };

      await expect(authService.login(loginData))
        .rejects.toThrow('Invalid username or password');
    });
  });

  describe('Token Verification Integration', () => {
    it('should verify valid JWT token', async () => {
      // Create a user and get token
      const userData = {
        username: 'test_token_user',
        email: 'test_token@example.com',
        password: 'password123'
      };
      const result = await authService.register(userData);
      testUserId = result.user.id;

      // Verify the token
      const decoded = authService.verifyToken(result.token);
      expect(decoded.userId).toBe(result.user.id);
    });

    it('should reject invalid JWT token', () => {
      const invalidToken = 'invalid.jwt.token';

      expect(() => authService.verifyToken(invalidToken))
        .toThrow('Invalid or expired token');
    });
  });
});

// If database is not available, show a message
if (!isDatabaseAvailable()) {
  describe('AuthService Integration Tests (Skipped)', () => {
    it('should skip AuthService tests when database is not available', () => {
      console.log('⏭️  AuthService integration tests skipped - database not available');
      expect(true).toBe(true); // Always pass
    });
  });
}