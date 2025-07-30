# E2E Test Troubleshooting Guide

## Overview

This document provides a comprehensive guide for troubleshooting End-to-End (E2E) test failures, based on our systematic approach to fixing the online shopping store E2E test suite. We transformed a failing test suite from 27% success rate to 100% success rate using these methodologies.

## Table of Contents

1. [Systematic Debugging Approach](#systematic-debugging-approach)
2. [Common Issue Categories](#common-issue-categories)
3. [Diagnostic Techniques](#diagnostic-techniques)
4. [Solution Patterns](#solution-patterns)
5. [Performance Optimization](#performance-optimization)
6. [Concurrency Issues](#concurrency-issues)
7. [Best Practices](#best-practices)

## Systematic Debugging Approach

### 1. Pattern Recognition
- **Run tests individually first** to isolate issues from concurrency problems
- **Group failures by type**: timeouts, API response mismatches, database errors, etc.
- **Identify recurring patterns** across different test suites
- **Prioritize root causes** over symptoms

### 2. Evidence Collection
- **Examine server error logs** during test execution
- **Debug actual API responses** vs expected responses
- **Check database state** before and after test operations
- **Analyze test execution timing** and resource usage

### 3. Root Cause Analysis
- **Database schema mismatches** (most common root cause)
- **API response structure changes** not reflected in tests
- **Test data conflicts** between concurrent tests
- **Resource cleanup issues** causing state pollution

## Common Issue Categories

### 1. Database Schema Mismatches

**Symptoms:**
- `Unknown column 'field_name' in 'field list'` errors
- Tests passing individually but failing in suites
- Inconsistent data retrieval results

**Root Causes:**
- Database schema using different field names than application code
- Migration scripts not applied consistently
- Development vs test environment differences

**Example Fix:**
```sql
-- Database had 'stock_quantity' but code expected 'inventory_quantity'
-- Fixed by updating database schema and all SQL queries
ALTER TABLE products CHANGE stock_quantity inventory_quantity INT NOT NULL DEFAULT 0;
```

### 2. API Response Structure Mismatches

**Symptoms:**
- `Cannot read properties of undefined` errors
- Tests expecting wrong response structure
- Inconsistent API response handling

**Common Patterns:**
```javascript
// Wrong expectation
expect(response.data.data.items).toHaveLength(0);

// Correct expectation (nested structure)
expect(response.data.data.cart.items).toHaveLength(0);

// Product API responses
expect(response.data.data.name).toBe('Product Name');        // Wrong
expect(response.data.data.product.name).toBe('Product Name'); // Correct
```

### 3. Test Data Conflicts

**Symptoms:**
- Tests passing individually but failing when run together
- Timeout errors during test setup
- "Already exists" errors for test data

**Root Causes:**
- Shared test data between tests
- Insufficient cleanup between tests
- Non-unique test data generation

**Solution Pattern:**
```javascript
// Replace shared scenarios
const { seller, product } = await E2ETestHelper.setupCompleteScenario();

// With unique scenarios
const { seller, product } = await E2ETestHelper.setupUniqueScenario();
```

### 4. Error Message Mismatches

**Symptoms:**
- Tests expecting generic error messages
- Actual API returning specific error messages

**Example Fixes:**
```javascript
// Generic expectation
E2ETestHelper.validateErrorResponse(response, 403, 'Not authorized');

// Specific expectation (correct)
E2ETestHelper.validateErrorResponse(response, 403, 'You can only update your own products');
```

### 5. HTTP Status Code Issues

**Symptoms:**
- Tests expecting wrong status codes
- API behavior changes not reflected in tests

**Common Fixes:**
```javascript
// Cart API returns 201 (Created) not 200 (OK)
expect(addToCartResponse.status).toBe(200); // Wrong
expect(addToCartResponse.status).toBe(201); // Correct
```

## Diagnostic Techniques

### 1. Response Structure Debugging

Add temporary logging to understand actual API responses:

```javascript
console.log('API Response:', JSON.stringify(response.data, null, 2));
```

### 2. Database State Inspection

Check database state during test execution:

```sql
-- Check table structure
DESCRIBE products;

-- Check data state
SELECT * FROM products WHERE id = ?;
```

### 3. Test Isolation Verification

Run tests individually to isolate concurrency issues:

```bash
# Run single test
npm run test:e2e -- --testNamePattern="specific test name"

# Run single test file
npm run test:e2e -- --testPathPatterns=test-file.test.ts
```

### 4. Server Log Analysis

Monitor server logs during test execution to identify:
- Database connection issues
- API endpoint errors
- Validation failures
- Authentication problems

## Solution Patterns

### 1. Database Schema Alignment

**Process:**
1. Identify schema mismatches in error logs
2. Update database schema files
3. Update all SQL queries in repositories
4. Rebuild application to apply changes

**Files to Update:**
- `src/database/e2e-schema.sql`
- `src/test-configs/test-helpers/database.ts`
- All repository files with SQL queries

### 2. API Response Structure Fixes

**Process:**
1. Debug actual API response structure
2. Update test expectations to match reality
3. Verify response structure across all endpoints
4. Update helper methods if needed

### 3. Test Data Isolation

**Process:**
1. Replace shared test data with unique generation
2. Implement proper cleanup strategies
3. Use timestamps or UUIDs for uniqueness
4. Avoid aggressive cleanup that removes necessary data

### 4. Performance Optimization

**Strategies:**
- Reduce concurrent database operations
- Optimize test data creation (sequential vs parallel)
- Minimize test data volume
- Implement efficient cleanup

## Performance Optimization

### 1. Test Data Creation

**Before (Slow):**
```javascript
// Creating 15 products concurrently
const productPromises = Array.from({ length: 15 }, (_, i) => createProduct(i));
await Promise.all(productPromises);
```

**After (Fast):**
```javascript
// Creating 6 products sequentially
for (let i = 0; i < 6; i++) {
  await createProduct(i);
}
```

### 2. Database Operations

**Optimization Techniques:**
- Use sequential operations for heavy database tasks
- Reduce test data volume where possible
- Implement targeted cleanup instead of full database resets
- Use connection pooling efficiently

### 3. Test Execution Time

**Improvements Achieved:**
- Shopping workflow: 52s → 3.4s (93% faster)
- Product management: 52s → 3.4s (93% faster)
- Security features: Maintained fast execution (~4s)

## Concurrency Issues

### 1. Rate Limiting Conflicts

**Problem:** Tests hitting rate limits when run concurrently

**Solution:**
- Implement test-specific rate limit bypasses
- Use different test users for concurrent tests
- Add delays between concurrent requests

### 2. Database Lock Contention

**Problem:** Tests competing for database resources

**Solution:**
- Use unique test data for each test
- Implement proper transaction isolation
- Avoid shared database state

### 3. Resource Cleanup Timing

**Problem:** Tests interfering with each other's cleanup

**Solution:**
- Use targeted cleanup instead of global cleanup
- Implement proper test isolation
- Use unique identifiers for all test data

## Best Practices

### 1. Test Design Principles

- **Isolation:** Each test should be independent
- **Repeatability:** Tests should produce consistent results
- **Speed:** Optimize for fast execution
- **Clarity:** Tests should clearly express intent

### 2. Data Management

- **Unique Data:** Generate unique test data for each test
- **Minimal Data:** Create only necessary test data
- **Proper Cleanup:** Clean up test data without affecting other tests
- **State Independence:** Don't rely on test execution order

### 3. Error Handling

- **Specific Assertions:** Use specific error messages, not generic ones
- **Proper Status Codes:** Verify correct HTTP status codes
- **Response Structure:** Match actual API response structures
- **Timeout Handling:** Set appropriate timeouts for operations

### 4. Debugging Workflow

1. **Run tests individually** to isolate issues
2. **Check server logs** for error details
3. **Debug API responses** to understand structure
4. **Verify database state** during test execution
5. **Apply systematic fixes** based on root cause analysis

## Success Metrics

Our systematic approach achieved:

| Test Suite | Before | After | Improvement |
|------------|--------|-------|-------------|
| Shopping Workflow | 3/11 (27%) | 11/11 (100%) | +267% |
| Product Management | 3/11 (27%) | 11/11 (100%) | +267% |
| Authentication | N/A | 10/10 (100%) | ✅ |
| Security Features | 12/14 (86%) | 14/14 (100%) | +14% |
| **Total** | **18/46 (39%)** | **46/46 (100%)** | **+156%** |

## Conclusion

The key to successful E2E test troubleshooting is:

1. **Systematic approach** over ad-hoc fixes
2. **Root cause analysis** over symptom treatment
3. **Pattern recognition** across similar failures
4. **Evidence-based debugging** using logs and API responses
5. **Performance optimization** through data and operation optimization

This methodology can be applied to any E2E test suite to achieve reliable, fast, and maintainable tests.