# Testing Guide

## Overview

This project uses a three-tier testing architecture following the testing pyramid principle:

```
    /\     E2E Tests (Few, Slow, High Confidence)
   /  \    - Complete user workflows
  /____\   - Real server + database
 /      \  - HTTP requests + responses
/________\ 
Integration Tests (Some, Medium Speed, Medium Confidence)
- Component interactions
- Real database connections
- Service layer testing

Unit Tests (Many, Fast, Low Confidence)
- Individual functions/classes
- Mocked dependencies
- Business logic validation
```

## Quick Start

```bash
# Run all tests
npm run test:all

# Run only unit tests (fast feedback)
npm test
npm run test:unit

# Run integration tests
npm run test:integration

# Run end-to-end tests
npm run test:e2e
```

## Test Types

### Unit Tests

**When to use:**
- Testing individual functions, classes, or modules in isolation
- Validating business logic without external dependencies
- Testing edge cases and error conditions
- Fast feedback during development

**Characteristics:**
- ⚡ Fast execution (< 10 seconds total)
- 🔒 Isolated with mocked dependencies
- 📁 Located in `src/__tests__/unit/`
- 🎯 High code coverage target (90%+)

**Example:**
```typescript
// src/__tests__/unit/services/AuthService.test.ts
describe('AuthService', () => {
  let authService: AuthService;
  let mockUserRepository: jest.Mocked<UserRepository>;
  
  beforeEach(() => {
    mockUserRepository = {
      findByUsername: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
    } as jest.Mocked<UserRepository>;
    
    authService = new AuthService(mockUserRepository);
  });
  
  describe('register', () => {
    it('should hash password before saving user', async () => {
      // Arrange
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'plaintext'
      };
      
      mockUserRepository.findByUsername.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue({ id: 1, ...userData });
      
      // Act
      await authService.register(userData);
      
      // Assert
      expect(mockUserRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          password_hash: expect.not.stringMatching('plaintext')
        })
      );
    });
  });
});
```

### Integration Tests

**When to use:**
- Testing interactions between multiple components
- Validating database operations and queries
- Testing API endpoints with real database
- Verifying service layer integration

**Characteristics:**
- 🐌 Medium execution speed (< 60 seconds total)
- 🔗 Real database connections
- 📁 Located in `src/__tests__/integration/`
- 🎯 Focus on critical integration paths

**Example:**
```typescript
// src/__tests__/integration/api/auth.test.ts
describe('Auth API Integration', () => {
  beforeAll(async () => {
    await DatabaseTestHelper.setupTestDatabase();
  });
  
  afterAll(async () => {
    await DatabaseTestHelper.cleanupTestDatabase();
  });
  
  beforeEach(async () => {
    await DatabaseTestHelper.clearTestData();
  });
  
  describe('POST /api/auth/register', () => {
    it('should create user in database and return token', async () => {
      // Arrange
      const userData = {
        username: 'integrationuser',
        email: 'integration@test.com',
        password: 'SecurePass123!'
      };
      
      // Act
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);
      
      // Assert
      expect(response.body.data.user.username).toBe(userData.username);
      expect(response.body.data.token).toBeDefined();
      
      // Verify user was actually created in database
      const userInDb = await UserRepository.findByUsername(userData.username);
      expect(userInDb).toBeTruthy();
      expect(userInDb.email).toBe(userData.email);
    });
  });
});
```

### End-to-End (E2E) Tests

**When to use:**
- Testing complete user workflows
- Validating entire application functionality
- Testing security features and authentication flows
- Simulating real user interactions

**Characteristics:**
- 🐢 Slow execution (< 120 seconds total)
- 🌐 Real server + database + HTTP requests
- 📁 Located in `src/__tests__/e2e/`
- 🎯 Focus on critical user journeys

**Example:**
```typescript
// src/__tests__/e2e/auth/registration-flow.test.ts
describe('User Registration Flow E2E', () => {
  let serverUrl: string;
  
  beforeAll(async () => {
    serverUrl = await E2ETestHelper.startTestServer();
  });
  
  afterAll(async () => {
    await E2ETestHelper.stopTestServer();
  });
  
  beforeEach(async () => {
    await DatabaseTestHelper.setupTestDatabase();
  });
  
  afterEach(async () => {
    await DatabaseTestHelper.cleanupTestDatabase();
  });
  
  it('should complete full user registration and login workflow', async () => {
    const userData = {
      username: 'e2euser',
      email: 'e2e@test.com',
      password: 'SecurePass123!',
      first_name: 'E2E',
      last_name: 'User'
    };
    
    // Step 1: Register new user
    const registerResponse = await E2ETestHelper.makeRequest({
      method: 'POST',
      url: `${serverUrl}/api/auth/register`,
      data: userData
    });
    
    expect(registerResponse.status).toBe(201);
    expect(registerResponse.data.data.user.username).toBe(userData.username);
    
    // Step 2: Login with new user
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
    
    // Step 3: Access protected endpoint
    const profileResponse = await E2ETestHelper.makeAuthenticatedRequest({
      method: 'GET',
      url: `${serverUrl}/api/auth/profile`
    }, loginResponse.data.data.token);
    
    expect(profileResponse.status).toBe(200);
    expect(profileResponse.data.data.user.username).toBe(userData.username);
  });
});
```

## Test Organization

### Directory Structure

```
backend/src/__tests__/
├── unit/                    # Unit tests (fast, isolated)
│   ├── models/             # Model validation tests
│   ├── services/           # Business logic tests
│   ├── repositories/       # Repository logic tests (mocked DB)
│   ├── middleware/         # Middleware logic tests
│   └── utils/              # Utility function tests
├── integration/            # Integration tests (medium speed)
│   ├── database/           # Database integration tests
│   ├── api/                # API endpoint tests
│   └── services/           # Service integration tests
└── e2e/                    # End-to-end tests (slow, comprehensive)
    ├── auth/               # Authentication workflows
    ├── products/           # Product management workflows
    ├── orders/             # Order processing workflows
    ├── security/           # Security feature tests
    └── config/             # Environment configuration tests
```

### File Naming Conventions

- **Unit tests:** `ComponentName.test.ts`
- **Integration tests:** `feature-name.test.ts`
- **E2E tests:** `workflow-name.test.ts`

### Test Configuration Files

```
backend/src/test-configs/
├── jest.unit.config.js         # Unit test configuration
├── jest.integration.config.js  # Integration test configuration
├── jest.e2e.config.js          # E2E test configuration
├── unit-setup.ts               # Unit test setup
├── integration-setup.ts        # Integration test setup
├── e2e-setup.ts                # E2E test setup
└── test-helpers/               # Shared test utilities
    ├── database.ts             # Database test helpers
    ├── server.ts               # Server test helpers
    ├── mocks.ts                # Mock factories
    └── builders.ts             # Test data builders
```

## Writing Tests

### Test Structure (AAA Pattern)

Follow the Arrange-Act-Assert pattern for all tests:

```typescript
it('should describe what the test does', async () => {
  // Arrange - Set up test data and mocks
  const testData = { /* test data */ };
  mockService.method.mockResolvedValue(expectedResult);
  
  // Act - Execute the code under test
  const result = await serviceUnderTest.method(testData);
  
  // Assert - Verify the results
  expect(result).toEqual(expectedResult);
  expect(mockService.method).toHaveBeenCalledWith(testData);
});
```

### Test Naming

Use descriptive test names that explain:
- **What** is being tested
- **When** (under what conditions)
- **Expected** outcome

```typescript
// ✅ Good
it('should return user when valid ID is provided')
it('should throw error when user is not found')
it('should hash password before saving to database')

// ❌ Bad
it('should work')
it('test user creation')
it('returns something')
```

### Mock Management

#### Unit Tests - Mock Everything External

```typescript
// Mock repositories
const mockUserRepository = {
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
} as jest.Mocked<UserRepository>;

// Mock external services
jest.mock('../services/EmailService', () => ({
  sendEmail: jest.fn().mockResolvedValue(true)
}));
```

#### Integration Tests - Mock External Services Only

```typescript
// Use real database, mock external APIs
jest.mock('../services/PaymentGateway', () => ({
  processPayment: jest.fn().mockResolvedValue({ success: true })
}));

// Real database connection
beforeAll(async () => {
  await DatabaseTestHelper.setupTestDatabase();
});
```

#### E2E Tests - Minimal Mocking

```typescript
// Only mock truly external services (payment gateways, email services)
// Use real database, real server, real HTTP requests
```

## Test Data Management

### Test Data Builders

Use builder pattern for complex test data:

```typescript
// src/test-configs/test-helpers/builders.ts
export class UserBuilder {
  private user: Partial<User> = {};
  
  withUsername(username: string): UserBuilder {
    this.user.username = username;
    return this;
  }
  
  withEmail(email: string): UserBuilder {
    this.user.email = email;
    return this;
  }
  
  asSeller(): UserBuilder {
    this.user.is_seller = true;
    return this;
  }
  
  build(): User {
    return {
      id: 1,
      username: 'defaultuser',
      email: 'default@example.com',
      is_seller: false,
      created_at: new Date(),
      updated_at: new Date(),
      ...this.user
    } as User;
  }
}

// Usage in tests
const testUser = new UserBuilder()
  .withUsername('testuser')
  .withEmail('test@example.com')
  .asSeller()
  .build();
```

### Database Test Helpers

```typescript
// src/test-configs/test-helpers/database.ts
export class DatabaseTestHelper {
  static async setupTestDatabase(): Promise<void> {
    // Create test database schema
    // Run migrations
    // Seed initial test data
  }
  
  static async cleanupTestDatabase(): Promise<void> {
    // Clear all test data
    // Reset auto-increment sequences
    // Close database connections
  }
  
  static async clearTestData(): Promise<void> {
    // Clear data between tests
    // Preserve schema and structure
  }
  
  static async createTestUser(userData?: Partial<User>): Promise<User> {
    const defaultUser = new UserBuilder().build();
    return await UserRepository.create({ ...defaultUser, ...userData });
  }
}
```

## Environment Configuration

### Unit Tests (`.env.test.unit`)

```env
NODE_ENV=test
LOG_LEVEL=error

# Minimal configuration - most services mocked
DB_HOST=localhost
DB_NAME=test_unit_db
DB_USER=test_user
DB_PASSWORD=test_password

# Mock external services
PAYMENT_GATEWAY_URL=http://mock-payment-gateway
EMAIL_SERVICE_URL=http://mock-email-service
```

### Integration Tests (`.env.test.integration`)

```env
NODE_ENV=test
LOG_LEVEL=error

# Real database for integration testing
DB_HOST=localhost
DB_NAME=test_integration_db
DB_USER=test_user
DB_PASSWORD=test_password
DB_PORT=3306

# Mock external services
PAYMENT_GATEWAY_URL=http://mock-payment-gateway
EMAIL_SERVICE_URL=http://mock-email-service

# Test-specific settings
JWT_SECRET=test-jwt-secret-key
BCRYPT_ROUNDS=4
```

### E2E Tests (`.env.test.e2e`)

```env
NODE_ENV=test
LOG_LEVEL=error

# Complete test environment
PORT=8101
DB_HOST=localhost
DB_NAME=test_e2e_db
DB_USER=test_user
DB_PASSWORD=test_password
DB_PORT=3306

# Test-specific settings
JWT_SECRET=test-jwt-secret-key
BCRYPT_ROUNDS=4

# Mock external services only
PAYMENT_GATEWAY_URL=http://mock-payment-gateway
EMAIL_SERVICE_URL=http://mock-email-service
```

## Best Practices

### General Testing Principles

1. **Test Behavior, Not Implementation**
   ```typescript
   // ✅ Good - tests behavior
   it('should return user profile when authenticated', async () => {
     const result = await authService.getProfile(validToken);
     expect(result.username).toBe('testuser');
   });
   
   // ❌ Bad - tests implementation
   it('should call jwt.verify with token', async () => {
     await authService.getProfile(validToken);
     expect(jwt.verify).toHaveBeenCalledWith(validToken);
   });
   ```

2. **Keep Tests Independent**
   ```typescript
   // ✅ Good - each test is independent
   beforeEach(() => {
     mockRepository.reset();
     testData = createFreshTestData();
   });
   
   // ❌ Bad - tests depend on each other
   let userId: number;
   it('should create user', () => {
     userId = createUser().id; // Next test depends on this
   });
   ```

3. **Use Descriptive Assertions**
   ```typescript
   // ✅ Good - clear expectations
   expect(response.status).toBe(201);
   expect(response.body.data.user.username).toBe('testuser');
   expect(response.body.data.token).toMatch(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/);
   
   // ❌ Bad - vague assertions
   expect(response).toBeTruthy();
   expect(response.body.data).toBeDefined();
   ```

### Unit Test Best Practices

1. **Mock All External Dependencies**
2. **Test Edge Cases and Error Conditions**
3. **Keep Tests Fast (< 10ms per test)**
4. **Use Descriptive Test Names**
5. **Follow Single Responsibility Principle**

### Integration Test Best Practices

1. **Test Real Component Interactions**
2. **Use Real Database Connections**
3. **Clean Up Test Data Between Tests**
4. **Focus on Critical Integration Points**
5. **Mock Only External Services**

### E2E Test Best Practices

1. **Test Complete User Workflows**
2. **Use Real HTTP Requests**
3. **Test Security and Authentication**
4. **Keep Tests Focused on Happy Paths**
5. **Mock Only External APIs**

## Debugging Tests

### Common Issues and Solutions

#### Test Timeouts
```typescript
// Increase timeout for slow operations
it('should handle large data processing', async () => {
  // Test implementation
}, 30000); // 30 second timeout

// Or configure globally in Jest config
module.exports = {
  testTimeout: 30000
};
```

#### Database Connection Issues
```typescript
// Ensure proper cleanup
afterAll(async () => {
  await DatabaseTestHelper.cleanupTestDatabase();
  await pool.end(); // Close database connections
});
```

#### Mock Issues
```typescript
// Clear mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
});

// Reset modules if needed
beforeEach(() => {
  jest.resetModules();
});
```

### Test Debugging Tools

1. **Console Logging**
   ```typescript
   console.log('Test data:', testData);
   console.log('Mock calls:', mockService.method.mock.calls);
   ```

2. **Jest Debug Mode**
   ```bash
   npm test -- --verbose --no-cache
   ```

3. **Database Query Logging**
   ```typescript
   // Enable query logging in test environment
   const pool = mysql.createPool({
     // ... config
     debug: process.env.NODE_ENV === 'test'
   });
   ```

## Performance Guidelines

### Test Execution Targets

- **Unit Tests:** < 10 seconds total
- **Integration Tests:** < 60 seconds total  
- **E2E Tests:** < 120 seconds total

### Optimization Strategies

1. **Parallel Execution**
   ```javascript
   // jest.config.js
   module.exports = {
     maxWorkers: '50%', // Use half of available CPU cores
   };
   ```

2. **Test Grouping**
   ```typescript
   // Group related tests to share setup
   describe('UserService', () => {
     beforeAll(() => {
       // Expensive setup once per group
     });
   });
   ```

3. **Selective Test Running**
   ```bash
   # Run only changed tests
   npm test -- --onlyChanged
   
   # Run specific test files
   npm test -- UserService.test.ts
   
   # Run tests matching pattern
   npm test -- --testNamePattern="should create user"
   ```

## Continuous Integration

### CI Pipeline Structure

```yaml
# Example GitHub Actions workflow
name: Test Pipeline

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Run unit tests
        run: npm run test:unit
        
  integration-tests:
    runs-on: ubuntu-latest
    needs: unit-tests
    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: root
          MYSQL_DATABASE: test_integration_db
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Run integration tests
        run: npm run test:integration
        
  e2e-tests:
    runs-on: ubuntu-latest
    needs: integration-tests
    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: root
          MYSQL_DATABASE: test_e2e_db
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Run E2E tests
        run: npm run test:e2e
```

### Test Reporting

Configure Jest to generate test reports:

```javascript
// jest.config.js
module.exports = {
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: './test-results',
      outputName: 'junit.xml'
    }],
    ['jest-html-reporters', {
      publicPath: './test-results',
      filename: 'report.html'
    }]
  ],
  collectCoverage: true,
  coverageDirectory: './coverage',
  coverageReporters: ['text', 'lcov', 'html']
};
```

## Troubleshooting

### Common Test Failures

1. **Async/Await Issues**
   ```typescript
   // ✅ Correct - await async operations
   it('should create user', async () => {
     const user = await userService.create(userData);
     expect(user.id).toBeDefined();
   });
   
   // ❌ Wrong - missing await
   it('should create user', () => {
     const user = userService.create(userData); // Returns Promise
     expect(user.id).toBeDefined(); // Will fail
   });
   ```

2. **Mock Not Working**
   ```typescript
   // ✅ Correct - mock before importing
   jest.mock('../services/EmailService');
   import { EmailService } from '../services/EmailService';
   
   // ❌ Wrong - import before mock
   import { EmailService } from '../services/EmailService';
   jest.mock('../services/EmailService'); // Too late
   ```

3. **Database Connection Issues**
   ```typescript
   // ✅ Correct - proper cleanup
   afterAll(async () => {
     await DatabaseTestHelper.cleanupTestDatabase();
     await pool.end();
   });
   ```

### Getting Help

1. **Check Test Output**
   - Read error messages carefully
   - Look for stack traces
   - Check mock call information

2. **Enable Debug Logging**
   ```bash
   DEBUG=* npm test
   ```

3. **Run Tests in Isolation**
   ```bash
   npm test -- --testNamePattern="specific test name"
   ```

4. **Check Test Coverage**
   ```bash
   npm test -- --coverage
   ```

This comprehensive testing guide should help you write effective tests at all levels of the testing pyramid. Remember: good tests are your safety net for confident code changes and reliable software delivery.