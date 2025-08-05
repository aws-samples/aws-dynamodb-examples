# Data Access Layer Indirection

## Overview

This script guides you through the process of introducing an indirection layer in an application's Data Access Layer (DAL). The goal is to enable multiple implementations while preserving existing test coverage. This approach allows seamless switching between different data store implementations while maintaining application functionality.

### Overall Guidelines

* Use shell commands to run tests before starting and after every complete code change
* Always write code that matches the conventions in the repository
* Make sure you have read a file before attempting to change it
* CRITICAL REQUIREMENT: Don't introduce a new language or framework into the codebase; for example, don't use Typescript in a JavaScript project if it is not already used, even if it is available
* Make a copy of this script in the codebase, and after each step, update the file to indicate which steps are done.  CONTINUE WORKING UNTIL ALL STEPS ARE MARKED DONE.  CHECK THAT THE CONSTRAINTS OF EACH STEP ARE SATISFIED BEFORE MARKING IT DONE. DO NOT DELETE OR EDIT THE CONSTRAINTS OR EXAMPLES IN THIS FILE.

## Parameters

- **codebase_path** (required): Path to the application codebase

## Steps

### 1. Analyze Existing Codebase

Analyze the current codebase to understand the data access patterns and dependencies.

**Constraints:**
- The model MUST determine the programming language and database technologies used
- The model MUST determine the test framework used in existing tests
- The model MUST determine if a dependency injection framework is used and which one is used
- The model MUST locate all DAL-related files in the codebase
- The model MUST document current data access patterns
- The model MUST map dependencies between components
- The model MUST identify test coverage metrics
- The model MUST identify whether there is already an indirection layer that can be enhanced
- The model MUST identify test code that is coupled to the current implementation of the DAL
- The model SHOULD document interface methods and signatures

### 2. Validate Environment

Ensure the current environment is ready for refactoring.

**Constraints:**
- The model MUST verify all tests are passing before proceeding
- The model SHOULD recommend creating a branch or backup of the codebase

### 3. Define Abstract Interface

Create an abstract interface corresponding to each existing DAL class that will serve as the contract for data store implementations.

**Constraints:**
- The model MUST create an interface/abstract class appropriate for the primary language
- The model MUST pay attention to naming conventions, including CamelCase vs. snake_case vs. lowerCamelCase
- The model MUST include match the existing interfaces wherever possible without creating a leaky abstraction.
- The model MUST determine appropriate async/sync patterns
- The model MUST define a consistent error handling strategy
- The model MUST run tests after every change to ensure that no breaking changes are introduced and all syntax is correct
- The model SHOULD define clear transaction boundaries
- The model SHOULD document the interface thoroughly
- The model MAY suggest optimizations for the interface design

**Examples:**

Given an application following MVC conventions with a model for Workspace, Resource, and Comment, the abstract interface should have an interface for Workspace, an interface for Resource, and an interface for Comment.  Each interface should have all the same methods as the concrete implementation.

Given an application that uses an ORM that has a class for each entity, the abstract interface should have an interface for each entity that matches the interface exposed by the ORM.

### 4. Create Implementation Classes

Implement concrete classes for the current data store.

**Constraints:**
- The model MUST create implementation classes for the current data store
- The model MUST ensure each implementation fully satisfies the interface contract
- The model MUST implement consistent error handling across implementations
- The model MUST preserve existing implementation behavior exactly
- The model MUST NOT change existing test or implementation code at this stage
- The model MUST re-run tests after this stage and fix any errors, WITHOUT changing the original implementation or test code

### 5. Implement Factory Pattern

Create a factory to instantiate the appropriate data store implementation.

**Constraints:**
- The model MUST implement a factory pattern that supports the current data store
- The model MUST ensure the factory pattern supports the addition of new data store implementations
- The model MUST handle configuration injection
- The model MUST provide clear error messages for invalid configurations
- The model MUST support runtime switching
- The model SHOULD add unit tests to ensure that the correct implementations are instantiated for each configuration.
- The model SHOULD adhere to testing practices used in the rest of the application.
- The model MAY implement caching or pooling strategies

### 6. Integrate the Factory Pattern into the Application

Integrate the new indirection layer with the application code.

**Constraints:**
- The model MUST maintain existing DI patterns if DI is used
- The model MUST support configuration-based selection of implementations
- The model MUST handle initialization properly
- The model SHOULD avoid any changes to existing code outside the DAL where possible
- The model MAY suggest improvements that reduce coupling between the application code and the DAL implementation

### 7. Update Test Suite

Ensure all tests work with the new indirection layer.

**Constraints:**
- The model MUST maintain existing test coverage
- The model MUST verify consistent behavior across implementations
- The model MUST NOT alter test setup logic for the current implementations, other than to adapt them to use the factory pattern
- The model MUST ensure that the test suite passes before exiting this stage
- The model MUST refactor tests to reduce coupling between test logic and the concrete DAL implmentation
- The model SHOULD test configuration switching
- The model SHOULD create tests for error scenarios
- The model MAY add implementation-specific tests as needed
- The model MAY suggest improvements to the test suite

### 8. Configure Implementation Selection

Create a configuration system to select the appropriate implementation.

**Constraints:**
- The model MUST define a configuration structure that supports all implementations
- The model MUST create separate configurations for different environments
- The model SHOULD document the configuration options

### 9. Validate Implementation

Verify that the indirection layer meets all requirements.

**Constraints:**
- The model MUST verify all existing tests pass with the new implementation
- The model MUST confirm error handling is consistent across implementations
- The model MUST validate that configuration management works correctly
- The model SHOULD verify documentation is updated
- The model SHOULD confirm logging is consistent across implementations
- The model MAY suggest monitoring solutions

### 9. Update Test Suite to Run Against All Implementations

Update the test runner and/or test code to repeat the same set of tests against all implementations.

**Constraints:**
- The model MUST ensure that running the test suite for the project covers all implementations
- The model MUST ensure that the same black box DAL test code is run against all implementations
- The model MUST ensure that all tests pass
- The model SHOULD add documentation on how to run the test suite against a specific implementation
- The model SHOULD add documentation on how to ensure the test suite runs against new implementations once they are added


## Next Steps

**Important**: ONLY After completing the steps mentioned in this script, after generating the required code files and passing tests, Ask the user's permission to run the generate_dal_code.script.md using the  file Stage3_DataModel.md as the data model description to continue code refactoring. 