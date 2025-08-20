# Testing Quick Reference

## When to Use Each Test Type

### Unit Tests (Fast)
**Use for:**
- Testing individual functions/classes
- Business logic validation
- Edge cases and error conditions
- Utility functions

**Characteristics:**
- ⚡ Fast (< 10 seconds total)
- 🔒 Isolated (all dependencies mocked)
- 📁 Location: `src/__tests__/unit/`

**Example:**
```typescript
// Testing a service method
it('should calculate discount correctly', () => {
  const price = 100;
  const discountPercent = 20;
  
  const result = calculateDiscount(price, discountPercent);
  
  expect(result).toBe(80);
});
```

### Integration Tests (Medium)
**Use for:**
- Testing component interactions
- Database operations
- API endpoints with real database
- Service layer integration

**Characteristics:**
- 🐌 Medium speed (< 60 seconds total)
- 🔗 Real database connections
- 📁 Location: `src/__tests__/integration/`

**Example:**
```typescript
// Testing API endpoint with database
it('should create user in database', async () => {
  const response = await request(app)
    .post('/api/users')
    .send({ username: 'testuser', email: 'test@example.com' })
    .expect(201);
    
  // Verify in database
  const user = await UserRepository.findById(response.body.data.user.id);
  expect(user.username).toBe('testuser');
});
```

### E2E Tests (Comprehensive)
**Use for:**
- Complete user workflows
- Authentication flows
- Security testing
- Critical business processes

**Characteristics:**
- 🐢 Slow (< 120 seconds total)
- 🌐 Real server + database + HTTP
- 📁 Location: `src/__tests__/e2e/`

**Example:**
```typescript
// Testing complete user workflow
it('should complete registration to purchase workflow', async () => {
  // Step 1: Register
  const registerResponse = await makeRequest('POST', '/api/auth/register', userData);
  
  // Step 2: Login
  const loginResponse = await makeRequest('POST', '/api/auth/login', credentials);
  
  // Step 3: Purchase
  const purchaseResponse = await makeAuthenticatedRequest('POST', '/api/orders', orderData, token);
  
  expect(purchaseResponse.status).toBe(201);
});
```

## Quick Commands

```bash
# Run all tests
npm run test:all

# Fast feedback during development
npm test

# Test specific type
npm run test:unit
npm run test:integration
npm run test:e2e

# Watch mode for development
npm test -- --watch

# Run specific test file
npm test UserService.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="should create user"

# Coverage report
npm test -- --coverage
```

## Test Structure Template

```typescript
describe('ComponentName', () => {
  // Setup
  beforeEach(() => {
    // Reset mocks, create test data
  });
  
  describe('methodName', () => {
    it('should do expected behavior when given valid input', () => {
      // Arrange
      const input = { /* test data */ };
      
      // Act
      const result = component.method(input);
      
      // Assert
      expect(result).toBe(expectedValue);
    });
    
    it('should handle error when given invalid input', () => {
      // Test error scenarios
    });
  });
});
```

## Common Patterns

### Unit Test Mocking
```typescript
// Mock external dependencies
jest.mock('../services/EmailService');
const mockEmailService = EmailService as jest.Mocked<typeof EmailService>;

// Setup mock behavior
mockEmailService.send.mockResolvedValue(true);
```

### Integration Test Database
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

### E2E Test Server
```typescript
beforeAll(async () => {
  serverUrl = await E2ETestHelper.startTestServer();
});

afterAll(async () => {
  await E2ETestHelper.stopTestServer();
});
```

## Debugging Tests

```bash
# Verbose output
npm test -- --verbose

# Debug specific test
npm test -- --testNamePattern="specific test" --verbose

# No cache (fresh run)
npm test -- --no-cache

# Run in Node debug mode
node --inspect-brk node_modules/.bin/jest --runInBand
```

## Test Naming Convention

**Good test names:**
- `should return user when valid ID provided`
- `should throw error when user not found`
- `should hash password before saving`

**Bad test names:**
- `should work`
- `test user creation`
- `returns something`

## File Organization

```
src/__tests__/
├── unit/
│   ├── models/
│   ├── services/
│   ├── repositories/
│   └── utils/
├── integration/
│   ├── api/
│   ├── database/
│   └── services/
└── e2e/
    ├── auth/
    ├── products/
    ├── orders/
    └── security/
```

## Performance Targets

| Test Type | Target Time | Actual Time |
|-----------|-------------|-------------|
| Unit | < 10 seconds | ~10.3 seconds ✅ |
| Integration | < 60 seconds | ~2.3 seconds ✅ |
| E2E | < 120 seconds | ~18.8 seconds ✅ |

## Common Issues & Solutions

**Tests timing out:**
```typescript
// Increase timeout for specific test
it('should handle slow operation', async () => {
  // test code
}, 30000); // 30 second timeout
```

**Database connection issues:**
```typescript
afterAll(async () => {
  await DatabaseTestHelper.cleanupTestDatabase();
  await pool.end(); // Close connections
});
```

**Mock not working:**
```typescript
// Mock before importing
jest.mock('../services/EmailService');
import { EmailService } from '../services/EmailService';
```

## Resources

- [Full Testing Guide](TESTING.md)
- [Best Practices](TESTING_BEST_PRACTICES.md)
- [Unit Test Template](test-templates/unit-test-template.ts)
- [Integration Test Template](test-templates/integration-test-template.ts)
- [E2E Test Template](test-templates/e2e-test-template.ts)