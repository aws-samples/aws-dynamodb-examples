# Testing Best Practices

## Overview

This document outlines best practices for writing effective tests in our three-tier testing architecture. Following these guidelines will help ensure our tests are reliable, maintainable, and provide confidence in our code quality.

## General Testing Principles

### 1. Test Behavior, Not Implementation

**✅ Good - Tests behavior:**
```typescript
it('should return user profile when valid token provided', async () => {
  const result = await authService.getProfile(validToken);
  expect(result.username).toBe('testuser');
  expect(result.email).toBe('test@example.com');
});
```

**❌ Bad - Tests implementation:**
```typescript
it('should call jwt.verify with correct parameters', async () => {
  await authService.getProfile(validToken);
  expect(jwt.verify).toHaveBeenCalledWith(validToken, process.env.JWT_SECRET);
});
```

### 2. Write Tests First (TDD)

Follow the Red-Green-Refactor cycle:
1. **Red:** Write a failing test
2. **Green:** Write minimal code to make it pass
3. **Refactor:** Improve code while keeping tests green

### 3. Keep Tests Independent

Each test should be able to run in isolation:

**✅ Good - Independent tests:**
```typescript
beforeEach(() => {
  mockRepository.reset();
  testUser = createFreshTestUser();
});
```

**❌ Bad - Dependent tests:**
```typescript
let userId: number;

it('should create user', () => {
  userId = createUser().id; // Next test depends on this
});

it('should find user', () => {
  const user = findUser(userId); // Depends on previous test
});
```

### 4. Use Descriptive Test Names

Test names should describe:
- **What** is being tested
- **When** (under what conditions)
- **Expected** outcome

**✅ Good test names:**
```typescript
it('should return 404 when user does not exist')
it('should hash password before saving to database')
it('should throw validation error when email is invalid')
it('should allow access when user has admin role')
```

**❌ Bad test names:**
```typescript
it('should work')
it('test user creation')
it('returns something')
it('handles error')
```

### 5. Follow AAA Pattern

Structure tests with Arrange-Act-Assert:

```typescript
it('should calculate total price with tax', () => {
  // Arrange
  const items = [
    { price: 10.00, quantity: 2 },
    { price: 5.00, quantity: 1 }
  ];
  const taxRate = 0.08;
  
  // Act
  const total = calculateTotalWithTax(items, taxRate);
  
  // Assert
  expect(total).toBe(27.00); // (20 + 5) * 1.08
});
```

## Unit Test Best Practices

### 1. Mock All External Dependencies

```typescript
// ✅ Good - All external dependencies mocked
jest.mock('../repositories/UserRepository');
jest.mock('../services/EmailService');
jest.mock('../utils/logger');

const mockUserRepository = UserRepository as jest.Mocked<typeof UserRepository>;
const mockEmailService = EmailService as jest.Mocked<typeof EmailService>;
```

### 2. Test Edge Cases and Error Conditions

```typescript
describe('UserService.validateAge', () => {
  it('should return true for valid adult age', () => {
    expect(validateAge(25)).toBe(true);
  });
  
  it('should return false for underage', () => {
    expect(validateAge(17)).toBe(false);
  });
  
  it('should handle edge case of exactly 18', () => {
    expect(validateAge(18)).toBe(true);
  });
  
  it('should throw error for negative age', () => {
    expect(() => validateAge(-5)).toThrow('Age cannot be negative');
  });
  
  it('should throw error for non-numeric age', () => {
    expect(() => validateAge('twenty')).toThrow('Age must be a number');
  });
});
```

### 3. Use Specific Assertions

**✅ Good - Specific assertions:**
```typescript
expect(response.status).toBe(201);
expect(response.body.data.user.username).toBe('testuser');
expect(response.body.data.token).toMatch(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/);
```

**❌ Bad - Vague assertions:**
```typescript
expect(response).toBeTruthy();
expect(response.body.data).toBeDefined();
expect(response.body.data.token).toBeTruthy();
```

### 4. Keep Tests Fast

- Target < 10ms per unit test
- Avoid real I/O operations
- Use synchronous operations when possible
- Mock time-consuming operations

```typescript
// ✅ Good - Fast test with mocked delay
jest.mock('../utils/delay');
const mockDelay = delay as jest.MockedFunction<typeof delay>;
mockDelay.mockResolvedValue(undefined);

it('should process data quickly', async () => {
  const result = await processWithDelay(data);
  expect(result).toBe(expectedResult);
  expect(mockDelay).toHaveBeenCalledWith(1000);
});
```

## Integration Test Best Practices

### 1. Use Real Database Connections

```typescript
beforeAll(async () => {
  await DatabaseTestHelper.setupTestDatabase();
});

afterAll(async () => {
  await DatabaseTestHelper.cleanupTestDatabase();
});

beforeEach(async () => {
  await DatabaseTestHelper.clearTestData();
});
```

### 2. Test Component Interactions

Focus on testing how components work together:

```typescript
it('should create user and send welcome email', async () => {
  // Arrange
  const userData = { username: 'newuser', email: 'new@test.com' };
  
  // Act
  const user = await userService.createUser(userData);
  
  // Assert
  // Verify user was created in database
  const dbUser = await userRepository.findById(user.id);
  expect(dbUser).toBeTruthy();
  
  // Verify welcome email was sent
  expect(mockEmailService.sendWelcomeEmail).toHaveBeenCalledWith(user.email);
});
```

### 3. Test Database Constraints and Transactions

```typescript
it('should rollback transaction when email sending fails', async () => {
  // Arrange
  const userData = { username: 'testuser', email: 'test@test.com' };
  mockEmailService.sendWelcomeEmail.mockRejectedValue(new Error('Email service down'));
  
  // Act & Assert
  await expect(userService.createUser(userData)).rejects.toThrow('Email service down');
  
  // Verify user was not created due to rollback
  const userCount = await userRepository.count();
  expect(userCount).toBe(0);
});
```

### 4. Mock Only External Services

```typescript
// ✅ Good - Mock external services only
jest.mock('../services/PaymentGateway'); // External service
jest.mock('../services/EmailProvider'); // External service

// Use real internal components
const userService = new UserService(new UserRepository(), new EmailService());
```

## E2E Test Best Practices

### 1. Test Complete User Workflows

```typescript
it('should complete user registration to first purchase workflow', async () => {
  // Step 1: Register
  const registerResponse = await makeRequest('POST', '/api/auth/register', userData);
  expect(registerResponse.status).toBe(201);
  
  // Step 2: Login
  const loginResponse = await makeRequest('POST', '/api/auth/login', credentials);
  expect(loginResponse.status).toBe(200);
  
  // Step 3: Browse products
  const productsResponse = await makeRequest('GET', '/api/products');
  expect(productsResponse.data.products.length).toBeGreaterThan(0);
  
  // Step 4: Add to cart
  const cartResponse = await makeAuthenticatedRequest('POST', '/api/cart/items', cartData, token);
  expect(cartResponse.status).toBe(201);
  
  // Step 5: Checkout
  const checkoutResponse = await makeAuthenticatedRequest('POST', '/api/orders/checkout', orderData, token);
  expect(checkoutResponse.status).toBe(201);
});
```

### 2. Verify Database State

```typescript
it('should update inventory after purchase', async () => {
  // Arrange
  const initialInventory = 10;
  const purchaseQuantity = 3;
  
  // Act
  await completePurchaseWorkflow(productId, purchaseQuantity);
  
  // Assert - Verify database state
  const updatedProduct = await DatabaseTestHelper.findProductById(productId);
  expect(updatedProduct.inventory_quantity).toBe(initialInventory - purchaseQuantity);
});
```

### 3. Test Security and Error Scenarios

```typescript
describe('Security E2E Tests', () => {
  it('should prevent SQL injection attacks', async () => {
    const maliciousInput = "'; DROP TABLE users; --";
    
    const response = await makeRequest('POST', '/api/auth/login', {
      username: maliciousInput,
      password: 'password'
    });
    
    expect(response.status).toBe(400); // Should be rejected by validation
    
    // Verify users table still exists
    const userCount = await DatabaseTestHelper.countUsers();
    expect(userCount).toBeGreaterThanOrEqual(0);
  });
});
```

### 4. Use Real HTTP Requests

```typescript
// ✅ Good - Real HTTP requests
const response = await axios.post(`${serverUrl}/api/auth/register`, userData);

// ❌ Bad - Direct function calls (not E2E)
const response = await authController.register(userData);
```

## Test Data Management

### 1. Use Test Data Builders

```typescript
class UserBuilder {
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

// Usage
const testUser = new UserBuilder()
  .withUsername('testuser')
  .withEmail('test@example.com')
  .asSeller()
  .build();
```

### 2. Create Meaningful Test Data

```typescript
// ✅ Good - Meaningful test data
const testUser = {
  username: 'john_doe_seller',
  email: 'john.doe@teststore.com',
  first_name: 'John',
  last_name: 'Doe',
  is_seller: true
};

// ❌ Bad - Generic test data
const testUser = {
  username: 'user1',
  email: 'test@test.com',
  first_name: 'Test',
  last_name: 'User'
};
```

### 3. Isolate Test Data

```typescript
beforeEach(async () => {
  // Create fresh test data for each test
  testUser = await DatabaseTestHelper.createTestUser({
    username: `testuser_${Date.now()}`, // Unique username
    email: `test_${Date.now()}@example.com` // Unique email
  });
});
```

## Mock Management

### 1. Reset Mocks Between Tests

```typescript
beforeEach(() => {
  jest.clearAllMocks(); // Clear call history
  // or
  jest.resetAllMocks(); // Clear call history and reset implementations
});
```

### 2. Use Specific Mock Implementations

```typescript
// ✅ Good - Specific mock behavior
mockUserRepository.findById.mockImplementation(async (id: number) => {
  if (id === 1) return testUser;
  if (id === 999) throw new Error('User not found');
  return null;
});

// ❌ Bad - Generic mock
mockUserRepository.findById.mockResolvedValue(testUser);
```

### 3. Verify Mock Interactions

```typescript
it('should call repository with correct parameters', async () => {
  await userService.updateUser(1, { username: 'newname' });
  
  expect(mockUserRepository.update).toHaveBeenCalledWith(1, {
    username: 'newname',
    updated_at: expect.any(Date)
  });
  expect(mockUserRepository.update).toHaveBeenCalledTimes(1);
});
```

## Error Testing

### 1. Test All Error Paths

```typescript
describe('Error handling', () => {
  it('should handle database connection errors', async () => {
    mockUserRepository.findById.mockRejectedValue(new Error('Database connection failed'));
    
    await expect(userService.getUser(1))
      .rejects
      .toThrow('Database connection failed');
  });
  
  it('should handle validation errors', async () => {
    const invalidUser = { username: '', email: 'invalid-email' };
    
    await expect(userService.createUser(invalidUser))
      .rejects
      .toThrow('Validation failed');
  });
});
```

### 2. Test Error Messages and Status Codes

```typescript
it('should return appropriate error response', async () => {
  const response = await request(app)
    .post('/api/users')
    .send({ username: '' })
    .expect(400);
    
  expect(response.body.error).toBe('Validation failed');
  expect(response.body.details).toContain('Username is required');
});
```

## Performance Testing

### 1. Set Appropriate Timeouts

```typescript
// For slow operations
it('should handle large data processing', async () => {
  const largeDataSet = generateLargeDataSet(10000);
  const result = await processLargeData(largeDataSet);
  expect(result).toBeDefined();
}, 30000); // 30 second timeout
```

### 2. Test Performance Requirements

```typescript
it('should complete user lookup within performance threshold', async () => {
  const startTime = Date.now();
  
  await userService.findUser(1);
  
  const executionTime = Date.now() - startTime;
  expect(executionTime).toBeLessThan(100); // Should complete in < 100ms
});
```

## Debugging Tests

### 1. Use Descriptive Console Logs

```typescript
it('should process complex workflow', async () => {
  console.log('Starting workflow with user:', testUser.username);
  
  const result = await complexWorkflow(testUser);
  
  console.log('Workflow result:', result);
  expect(result.success).toBe(true);
});
```

### 2. Add Debug Information to Failures

```typescript
it('should calculate correct total', () => {
  const items = [{ price: 10, quantity: 2 }, { price: 5, quantity: 1 }];
  const result = calculateTotal(items);
  
  expect(result).toBe(25, `Expected 25 but got ${result}. Items: ${JSON.stringify(items)}`);
});
```

### 3. Use Jest Debug Mode

```bash
# Run specific test with debug output
npm test -- --testNamePattern="should calculate total" --verbose

# Run with no cache for fresh results
npm test -- --no-cache

# Run in watch mode for development
npm test -- --watch
```

## Common Anti-Patterns to Avoid

### 1. Testing Implementation Details

```typescript
// ❌ Bad - Testing implementation
it('should call bcrypt.hash', async () => {
  await authService.hashPassword('password');
  expect(bcrypt.hash).toHaveBeenCalled();
});

// ✅ Good - Testing behavior
it('should return hashed password different from original', async () => {
  const original = 'password';
  const hashed = await authService.hashPassword(original);
  expect(hashed).not.toBe(original);
  expect(hashed.length).toBeGreaterThan(original.length);
});
```

### 2. Overly Complex Test Setup

```typescript
// ❌ Bad - Complex setup
beforeEach(async () => {
  const user1 = await createUser({ username: 'user1' });
  const user2 = await createUser({ username: 'user2' });
  const category1 = await createCategory({ name: 'cat1' });
  const category2 = await createCategory({ name: 'cat2' });
  const product1 = await createProduct({ name: 'prod1', category: category1.id, seller: user1.id });
  // ... 20 more lines of setup
});

// ✅ Good - Simple, focused setup
beforeEach(async () => {
  testUser = await TestDataBuilder.createUser();
  testProduct = await TestDataBuilder.createProduct({ seller: testUser.id });
});
```

### 3. Testing Multiple Things in One Test

```typescript
// ❌ Bad - Testing multiple concerns
it('should handle user registration and email and logging', async () => {
  const user = await userService.register(userData);
  expect(user.id).toBeDefined(); // Testing registration
  expect(mockEmailService.send).toHaveBeenCalled(); // Testing email
  expect(mockLogger.info).toHaveBeenCalled(); // Testing logging
});

// ✅ Good - One concern per test
it('should create user with valid ID', async () => {
  const user = await userService.register(userData);
  expect(user.id).toBeDefined();
});

it('should send welcome email after registration', async () => {
  await userService.register(userData);
  expect(mockEmailService.send).toHaveBeenCalledWith(userData.email, 'Welcome!');
});
```

### 4. Ignoring Test Failures

```typescript
// ❌ Bad - Ignoring failures
it.skip('should handle edge case', () => {
  // Test that sometimes fails, so we skip it
});

// ✅ Good - Fix the test or mark as known issue
it('should handle edge case', () => {
  // Fixed the flaky test by improving setup
  expect(handleEdgeCase()).toBe(expectedResult);
});
```

## Test Maintenance

### 1. Regularly Review and Update Tests

- Remove obsolete tests when features are removed
- Update tests when requirements change
- Refactor tests to improve readability
- Keep test dependencies up to date

### 2. Monitor Test Performance

```bash
# Check test execution times
npm test -- --verbose

# Profile slow tests
npm test -- --detectSlowTests
```

### 3. Maintain Test Documentation

- Document complex test scenarios
- Explain why certain mocks are needed
- Keep test README files updated
- Document test data requirements

## Conclusion

Following these best practices will help ensure our tests are:

- **Reliable:** Consistent results every time
- **Maintainable:** Easy to update when code changes
- **Fast:** Quick feedback during development
- **Clear:** Easy to understand what's being tested
- **Comprehensive:** Good coverage of functionality and edge cases

Remember: Good tests are an investment in code quality and developer productivity. Take time to write them well, and they'll pay dividends in confidence and maintainability.