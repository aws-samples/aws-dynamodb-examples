# Generate Data Model

## Overview

This script walks through the process of creating a Data Access Layer (DAL) or set of model classes to interact with data stored in DynamoDB. The goal is to refactor existing application code that interacts with a relational database to work with DynamoDB while maintaining business functionality and optimizing for DynamoDB access patterns. 

### Overall Guidelines

* **⚠️ CRITICAL: Test Execution Gate**
  * The Model MUST NOT make changes to the existing test cases
  * The Model MUST NOT create any Mock tests or use any Mock data 
  * The model MUST run tests before making any code changes
  * The model MUST run tests after each substantive change
  * The model MUST NOT proceed with implementation if tests cannot be run
  * The model MUST NOT proceed with implementation if tests are failing, unless the failures are explicitly documented and understood
* Always write code that matches the conventions in the repository
* Use the same version of the programming language that is used in the repository
* Do not change requirements for business functionality
* Consider memory/compute limitations and respect quotas and limits for DynamoDB
* DynamoDB doesn't have auto-increment. Keep the ID generated from MySQL (in the same format) but cast it to match the destination DynamoDB data type. You will need to use the IDs generated from MySQL to write them to DynamoDB in the initial stages of the migration. 
* Prioritize DynamoDB access patterns and recommended schema design during refactoring
* Make sure you have read a file before you try to change it
* Don't worry about migrating data, that will be handled in a separate task
* Make a copy of this script in the codebase, and after each step, update the file to indicate which steps are done.  CONTINUE WORKING UNTIL ALL STEPS ARE MARKED DONE.  CHECK THAT THE CONSTRAINTS OF EACH STEP ARE SATISFIED BEFORE MARKING IT DONE. DO NOT DELETE OR EDIT THE CONSTRAINTS OR EXAMPLES IN THIS FILE.

## Parameters

- **codebase_path** (required, defaults to current directory): Path to the application code to modify
- **model_file** (required): Path to a file that describes the desired data model in DynamoDB

## Steps

### 1. Test Discovery

1. Identify the testing framework and commands used in the repository
2. Locate existing test files related to the data access layer
3. Understand how tests are organized and executed in this project
4. Document the appropriate commands or procedures to run tests in this specific repository

### 2. Test Environment Verification

Before beginning implementation:
1. Run DynamoDB local using Docker if it is not already running.
2. Verify that the test environment is properly configured. 
3. Ensure test databases are available
4. Run a sample test to confirm the testing framework is operational
5. Document any special requirements needed for testing the data access layer

### 3. Analyze Existing Codebase

**Steps:**
1. Run the repository's test suite to establish baseline functionality
2. Document any existing test failures before making changes
3. Analyze the current codebase to understand the database interaction patterns and data access requirements

**Constraints:**
- The model MUST identify the programming language and select the appropriate DynamoDB SDK
- The model MUST analyze all database interaction code in the application
- The model MUST evaluate dependencies between components
- The model MUST identify any indirection layer that is used to allow for multiple implementations of the DAL
- The model SHOULD identify test coverage and existing test cases

**Test Verification:**
After completing analysis:
1. Run the repository's test suite again to ensure nothing was broken during exploration
2. Document the test results as a baseline for future comparison

### 4. Implement Data Access Layer

**Implementation Approach:**
1. Write a failing test for the feature
2. Implement the minimum code to make the test pass
3. Run the test suite to verify
4. Refactor while keeping tests passing
5. Repeat for each feature

**Steps:**
1. Create the basic structure for the new DAL implementation
2. Run the test suite to verify the structure doesn't break existing functionality
3. Implement the first entity's operations
4. Run tests again to verify the implementation
5. Continue with remaining entities, testing after each implementation

**Constraints:**
- The model MUST implement all operations for each entity that are implemented for other databases
- The model MUST follow the provided data model description when making decisions about how to store or query data in DynamoDB
- The model MUST implement consistent error handling
- The model MUST handle DynamoDB-specific limitations (item size, throughput)
- The model MUST implement appropriate transaction handling
- The model MUST maintain existing API contracts
- The model MUST ensure consistent behavior across database implementations
- The model SHOULD implement batch operations where appropriate
- The model SHOULD include pagination for large result sets
- The model MAY implement caching strategies for frequently accessed data

**Test Validation Gate:**
After each implementation step, run the repository's test suite and verify they pass. If tests fail:
1. Review the error messages
2. Fix the issues
3. Run tests again
4. Only proceed when tests pass

### 5. Update Test Suite

**Before Implementing Each Test Component:**
1. Create appropriate test files for the new implementation. The test case should run integration tests against real databases
2. Run the test suite to ensure the test framework is working with your new files
3. Only proceed if tests run successfully

**Constraints:**
- The model MUST adapt existing tests to work with the DynamoDB implementation
- The model MUST verify consistent behavior between relational and DynamoDB implementations
- The model MUST test all access patterns
- The model MUST test error scenarios and edge cases
- The model MUST test performance under load
- The model SHOULD use shared test code to test both the relational and DynamoDB behavior without copying test code
- The model SHOULD implement integration tests with DynamoDBLocal
- The model MAY suggest improvements to the test suite

**Test Verification:**
After implementing test updates:
1. Run the repository's test suite
2. Document any failing tests
3. Fix issues before proceeding
4. Verify all tests pass before moving to the next component

### 6. Implement Error Handling and Retries

**Steps:**
1. Run tests to verify current state before adding error handling
2. Implement error handling for one operation
3. Run tests to verify the implementation
4. Continue with remaining operations, testing after each implementation

**Constraints:**
- The model MUST implement comprehensive error handling for all DynamoDB operations
- The model MUST handle provisioned throughput exceeded exceptions with backoff
- The model MUST handle conditional check failures appropriately
- The model MUST implement idempotent operations where possible
- The model SHOULD implement exponential backoff for retries
- The model SHOULD log detailed error information
- The model MAY implement circuit breaker patterns for persistent failures

**Test Verification:**
After implementing error handling:
1. Run the repository's test suite
2. Verify that error scenarios are properly handled
3. Fix any issues before proceeding

### 7. Implement Monitoring and Logging

**Steps:**
1. Run tests to verify current state before adding monitoring
2. Implement monitoring for one component
3. Run tests to verify the implementation
4. Continue with remaining components, testing after each implementation

**Constraints:**
- The model MUST implement logging for all database operations
- The model MUST track operation latency and error rates
- The model MUST configure CloudWatch metrics for DynamoDB tables
- The model SHOULD set up alarms for throughput limits and errors
- The model SHOULD implement distributed tracing if applicable
- The model MAY suggest dashboard configurations for monitoring

**Test Verification:**
After implementing monitoring:
1. Run the repository's test suite
2. Verify that monitoring does not interfere with functionality
3. Fix any issues before proceeding

### 8. Refine SDK Configuration Code

**Steps:**

1. Examine current SDK configuration code and assess whether the production configuration will use DynamoDB defaults when no local overrides are configured
2. Refactor configuration code to use defaults as much as possible in the production configuration
3. Validate that test setup still works with DynamoDB local and that production code will use defaults

**Constraints:**
- The model MUST ensure that the production configuration does not use DynamoDB local
- The model SHOULD use SDK defaults whenever settings are not overridden
- The model SHOULD prefer to pick up credentials using the default credential provider
- The model MAY use other methods to populate credentials if they were already used in the original codebase

**Test Verification:**
After refining the SDK configuration code:
1. Run the repository's test suite
2. Verify that tests pass and use DynamoDB local by default
3. Provide dummy credentials as environment variables and run tests using the production environment to verify that tests fail with credential errors

### 8. Validate Implementation

**Testing Workflow:**
1. Run baseline tests using the repository's testing mechanism
2. Verify all test cases pass with the DynamoDB implementation
3. Document any differences in behavior between implementations
4. Fix any issues before finalizing

**Constraints:**
- The model MUST verify all existing tests pass with the DynamoDB implementation
- The model MUST confirm error handling is robust
- The model MUST validate that all access patterns are supported
- The model MUST verify performance meets requirements
- The model SHOULD document any differences in behavior between implementations
- The model SHOULD provide cost estimates for the DynamoDB implementation
- The model MAY suggest further optimizations

**Final Test Verification:**
1. Run the complete test suite one final time
2. Document the test results and compare with the baseline
3. Ensure all tests pass before considering the implementation complete