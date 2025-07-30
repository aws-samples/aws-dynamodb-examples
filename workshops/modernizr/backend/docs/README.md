# Backend Documentation

## Overview

This directory contains comprehensive documentation for the Online Shopping Store backend API, with a focus on our three-tier testing architecture.

## Testing Documentation

### 📚 Main Guides
- **[Testing Guide](TESTING.md)** - Complete guide to our testing architecture
- **[Testing Best Practices](TESTING_BEST_PRACTICES.md)** - Best practices and guidelines
- **[Quick Reference](TESTING_QUICK_REFERENCE.md)** - Quick reference for daily development

### 📋 Templates
- **[Unit Test Template](test-templates/unit-test-template.ts)** - Template for unit tests
- **[Integration Test Template](test-templates/integration-test-template.ts)** - Template for integration tests
- **[E2E Test Template](test-templates/e2e-test-template.ts)** - Template for end-to-end tests

## Testing Architecture Overview

Our testing follows the testing pyramid principle:

```
    /\     E2E Tests (Few, Slow, High Confidence)
   /  \    - Complete user workflows
  /____\   - Real server + database
 /      \  - HTTP requests + responses
/__________\ 
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

### Running Tests

```bash
# Run all tests
npm run test:all

# Fast feedback during development
npm test

# Run specific test types
npm run test:unit        # Unit tests (< 10s)
npm run test:integration # Integration tests (< 60s)
npm run test:e2e        # End-to-end tests (< 120s)
```

### Writing Your First Test

1. **Choose the right test type:**
   - **Unit:** Testing individual functions/classes
   - **Integration:** Testing component interactions
   - **E2E:** Testing complete user workflows

2. **Use the appropriate template:**
   - Copy from `docs/test-templates/`
   - Follow the AAA pattern (Arrange-Act-Assert)
   - Use descriptive test names

3. **Place in correct directory:**
   - Unit: `src/__tests__/unit/`
   - Integration: `src/__tests__/integration/`
   - E2E: `src/__tests__/e2e/`

## Test Statistics

### Current Test Coverage
- **Total Tests:** 344 tests
- **Unit Tests:** 284 tests (100% passing)
- **Integration Tests:** 11 tests (100% passing)
- **E2E Tests:** 49 tests (100% passing)

### Performance Metrics
| Test Type | Target | Actual | Status |
|-----------|--------|--------|---------|
| Unit | < 10s | ~10.3s | ✅ |
| Integration | < 60s | ~2.3s | ✅ |
| E2E | < 120s | ~18.8s | ✅ |

## Test Environment Configuration

### Environment Files
- `.env.test.unit` - Unit test environment (minimal config)
- `.env.test.integration` - Integration test environment (real database)
- `.env.test.e2e` - E2E test environment (complete setup)

### Test Helpers
- `DatabaseTestHelper` - Database setup/cleanup utilities
- `E2ETestHelper` - Server and HTTP request utilities
- `MockFactory` - Mock object creation utilities
- `TestDataBuilder` - Test data creation utilities

## Development Workflow

### Test-Driven Development (TDD)
1. **Red:** Write a failing test
2. **Green:** Write minimal code to make it pass
3. **Refactor:** Improve code while keeping tests green

### Before Committing
```bash
# Run linting
npm run lint

# Run all tests
npm run test:all

# Check coverage
npm test -- --coverage
```

## Troubleshooting

### Common Issues
- **Tests timing out:** Increase timeout or optimize test setup
- **Database connection errors:** Check test database configuration
- **Mock not working:** Ensure mocks are set up before imports
- **Flaky tests:** Review test isolation and cleanup

### Debug Commands
```bash
# Verbose output
npm test -- --verbose

# Run specific test
npm test -- --testNamePattern="test name"

# No cache
npm test -- --no-cache

# Watch mode
npm test -- --watch
```

## Contributing

### Adding New Tests
1. Choose appropriate test type based on what you're testing
2. Use the relevant template from `test-templates/`
3. Follow naming conventions and best practices
4. Ensure tests are isolated and independent
5. Add appropriate documentation for complex test scenarios

### Updating Documentation
1. Keep documentation in sync with code changes
2. Update examples when APIs change
3. Add new patterns and best practices as they emerge
4. Review and update performance targets periodically

## Resources

### External Resources
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Library](https://testing-library.com/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)

### Internal Resources
- [API Documentation](../README.md)
- [Database Schema](../database/schema.sql)
- [Environment Configuration](../.env.example)

## Support

For questions about testing:
1. Check the [Testing Guide](TESTING.md) first
2. Review [Best Practices](TESTING_BEST_PRACTICES.md)
3. Look at existing tests for examples
4. Use the [Quick Reference](TESTING_QUICK_REFERENCE.md) for common patterns

---

*This documentation is maintained as part of our commitment to code quality and developer experience. Please keep it updated as the codebase evolves.*