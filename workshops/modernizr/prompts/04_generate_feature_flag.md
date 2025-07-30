# Data control dual writes and reads

## Overview
You are migrating an application from an SQL database to DynamoDB, you already have migrated the code and it successfully passes unit testing using a Data Access Lauyer (DAL). Your goal is to enable dual reads, and dual writes to control the data from the application side via feature flags. The goal is to allow control to reaad or write from both databases individually, it can be dual writes, dual reads, one or the other. 


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
* Prioritize DynamoDB access patterns and recommended schema design during refactoring
* Make sure you have read a file before you try to change it
* Don't worry about migrating data, that will be handled in a separate task

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

### 4. Implement Data control dual writes and reads

**Implementation Approach:**
1. Write a failing test for the feature
2. Implement the minimum code to make the test pass
3. Run the test suite to verify
4. Refactor while keeping tests passing
5. Repeat for each feature

**Steps:**
1. Create the basic structure for the new data control implementation using feature flags.
2. The feature flag needs to cover the following scenarios:
    - Write to MySQL, Read from MySQL.
    - Dual Writes, Read from MySQL.
    - Dual Writes, Read from both.
    - Dual Writes, Read from DynamoDB.
    - Write to DynamoDB, Read from DynamoDB. 
4. Include a verification logic when the dual reads are retrieved, ensure both results are the same and raise an error in case it fails, focus on the attribute names instead of comparing strings.
5. The dual write logic must prioritize writing the data to the source database (MySQL), retrieve the IDs generated and use this information to write the data into DynamoDB.
6. Add a very simple web page that allows to control the feature flags. The feature flag is controlled via cookies, do not add styling files for this webpage, but do add a item in the menu.
7. For the web page that control the feature flats ensure all the html headers are present. 
8. The feature flags could be updated both single and multiple flag updates
9. Ensure the forms are well formated for every feature flag.
10. DO NOT MODIFY THE EXISTING CSS for the original website style to ensure you don't break the original application functionality. 
11. Run the test suite to verify the structure doesn't break existing functionality
12. Implement the first entity's operations
13. Run tests again to verify the implementation
14. Continue with remaining entities, testing after each implementation


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
- Include comprenhensive logs to validate the read and write of the items when the dynamodb flags are on
- DO NOT CHANGE CSS CONFIGURATIONS, USE WHATEVER THE APPLICATION IS USING
- KEEP RUNNING THE TESTS UNTIL THEY ALL PASS
- DO NOT MODIFY THE EXISTING DATABASE LOGIC, EITHER FOR DYNAMODB OR MYSQL ADD WRAPPERS ON TOP OF THE EXISTING LOGIC. 

**Test Verification:**
After implementing test updates:
1. Run the repository's test suite
2. Document any failing tests
3. Fix issues before proceeding
4. Verify all tests pass before moving to the next component

### 5. Explain the user how to enable the feature flags from the web

**Implementation Approach:**
1. Create a clear guide in markdown format, the user will read this guide and understand how to enable disable the feature flag approach in their application.
