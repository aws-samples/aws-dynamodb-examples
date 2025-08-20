# Feature Flags System - Tasks

## COMMIT FREQUENCY AND TASK COMPLETION

**IMPORTANT**: 
- **Commit changes frequently** throughout this stage to maintain a clean Git history
- **Use `git -P`** to avoid interactive prompts
- **Mark tasks as completed** by changing `[ ]` to `[x]` as you finish each task
- **Commit after each major task completion** with descriptive messages
- **Update the tasks.md file** itself when marking tasks complete and commit those changes too
- **Use single working log**: Use `artifacts/stage-05/05_working_log.md` throughout the entire stage (not individual logs per subtask)
- **DO NOT MODIFY THE CONTENT OF THIS FILE**: Only add a [x] mark to complete the task, for tracking purposes.

- [x] 1. BACKEND: Set up feature flag infrastructure and environment
  - [x] 1.1 Analyze existing codebase and test framework
    - **FIRST**: Create working log file `artifacts/stage-05/05_working_log.md` to track progress and important notes throughout this entire stage
    - Identify the testing framework and commands used in the repository (Jest, Mocha, etc.)
    - Locate existing test files related to the data access layer and dual-database abstraction from stage-03
    - Understand how tests are organized and executed in this project
    - Document the appropriate commands or procedures to run tests in this specific repository
    - Review the dual-database abstraction layer from stage-03 to understand the factory pattern and configuration system
    - **COMMIT**: Commit codebase analysis with message "stage-05 task 1.1: Analyze existing codebase and test framework"
    - _Requirements: 1.4_

  - [x] 1.2 Set up DynamoDB Local development environment
    - **CRITICAL**: Create DynamoDB Local setup scripts similar to existing database setup in backend folder
    - **EXAMINE EXISTING**: Review existing database setup scripts in `backend/` folder to understand the pattern
    - **CREATE SETUP SCRIPT**: Create `backend/scripts/setup-dynamodb-local.sh` (or similar) that:
      - Downloads and starts DynamoDB Local using Docker
      - Creates all tables defined in the migration contract from stage-02
      - Sets up proper environment variables for local development
      - Provides commands to start/stop/reset DynamoDB Local
    - **DOCKER COMPOSE**: Update or create `docker-compose.yml` to include DynamoDB Local service alongside MySQL
    - **DOCUMENTATION**: Create `backend/docs/dynamodb-local-setup.md` with setup and usage instructions
    - **CRITICAL**: Ensure both MySQL and DynamoDB Local can run simultaneously for dual-database testing
    - **COMMIT**: Commit DynamoDB Local setup with message "stage-05 task 1.2: Set up DynamoDB Local development environment with setup scripts"
    - _Requirements: 1.3_

  - [x] 1.3 Validate development environment setup
    - **CRITICAL**: Test that both MySQL and DynamoDB Local are running and accessible
    - Verify that the test environment is properly configured with both databases
    - Run sample operations against both databases to confirm connectivity
    - Test that tables can be created and accessed in DynamoDB Local
    - Ensure test databases are available and accessible for feature flag testing
    - Document any special requirements needed for testing the data access layer
    - **COMMIT**: Commit environment validation with message "stage-05 task 1.3: Validate development environment setup"
    - _Requirements: 1.3_

  - [x] 1.4 Design and implement backend-based feature flag system
    - Design backend-based feature flag system with configuration-based storage
    - Implement basic flag reading and writing infrastructure in the backend service layer
    - **EXPLICIT FLAG STRUCTURE**: Create flag configuration supporting these specific flags:
      - `dual_write_enabled: boolean` - Enable writing to both MySQL and DynamoDB
      - `dual_read_enabled: boolean` - Enable reading from both databases with validation
      - `read_from_dynamodb: boolean` - Switch primary read source to DynamoDB
      - `migration_phase: number` - Current migration phase (1-5)
      - `validation_enabled: boolean` - Enable data validation during dual-read
    - Integrate flag system with the dual-database factory pattern from stage-03
    - **CRITICAL**: Run tests before and after each substantive change
    - **COMMIT**: Commit feature flag system with message "stage-05 task 1.4: Design and implement backend-based feature flag system"
    - _Requirements: 1.1, 1.2_

  - [x] 1.5 Validate feature flag infrastructure
    - **EXPLICIT TESTING**: Test each specific flag individually:
      - Test `dual_write_enabled` flag toggles dual-write behavior
      - Test `dual_read_enabled` flag toggles dual-read behavior  
      - Test `read_from_dynamodb` flag switches read source
      - Test `migration_phase` flag controls overall migration state
      - Test `validation_enabled` flag controls data validation
    - Verify that flags persist correctly across application restarts
    - Test both single and multiple flag updates simultaneously
    - **INTEGRATION TESTING**: Ensure flag system integrates with stage-03 dual-database abstraction:
      - Test that factory pattern respects flag settings
      - Test that repository selection changes based on flags
      - Test that configuration system works with flag overrides
    - **COMMIT**: Commit feature flag validation with message "stage-05 task 1.5: Validate feature flag infrastructure"
    - _Requirements: 1.5_

- [x] 2. BACKEND: Implement dual-write functionality with MySQL priority
  - **PREREQUISITE**: Ensure task 1 (feature flag system) is completed before starting dual-write implementation
  - **INTEGRATION**: Dual-write logic must use the feature flag system to control write behavior
  - [x] 2.1 Identify and document all entities requiring dual-write
    - **CRITICAL**: Review stage-03 dual-database abstraction to identify ALL entities with DynamoDB implementations
    - **EXPLICIT ENTITY LIST**: Create comprehensive list in working log of every entity that needs dual-write:
      - List each entity class (e.g., User, Product, Order, etc.)
      - Identify the corresponding repository class for each entity
      - Document the primary key and key attributes for each entity
      - Verify each entity has both MySQL and DynamoDB repository implementations from stage-04
    - **COMPLETENESS CHECK**: Ensure no entities are missed by cross-referencing:
      - Stage-01 API access patterns (what entities are accessed via API)
      - Stage-02 migration contract (what tables are defined)
      - Stage-04 DynamoDB implementations (what repositories were created)
    - **USER CONFIRMATION**: Present the complete entity list to user and ask: "Are these ALL the entities that need dual-write support?"
    - **COMMIT**: Commit entity documentation with message "stage-05 task 2.1: Identify and document all entities requiring dual-write"
    - _Requirements: 2.3_

  - [x] 2.2 Create dual-write wrapper infrastructure
    - **CRITICAL**: Use wrapper approach - add wrappers on top of existing database logic, don't modify existing logic
    - **EXPLICIT WRAPPER PATTERN**: For EACH entity identified in task 2.1, create a wrapper class:
      - Create `DualWrite{EntityName}Repository` class (e.g., `DualWriteUserRepository`)
      - Wrapper should accept both MySQL and DynamoDB repository instances in constructor
      - Wrapper should implement the same interface as the original repository
      - Wrapper should contain flag-checking logic to determine write behavior
    - **FLAG-BASED ROUTING**: Implement clear routing logic in each wrapper using the feature flag system from task 1.4:
      - **Read flags**: Use the feature flag system to check `dual_write_enabled` flag value
      - If `dual_write_enabled = false`: Write only to MySQL (existing behavior)
      - If `dual_write_enabled = true`: Write to both MySQL first, then DynamoDB
      - **Integration**: Ensure wrapper classes can access the feature flag system implemented in task 1.4
      - Never write to DynamoDB without also writing to MySQL
    - **CRITICAL**: Run tests before and after each wrapper creation, use real databases (no mocks)
    - **COMMIT**: Commit dual-write infrastructure with message "stage-05 task 2.2: Create dual-write wrapper infrastructure"
    - _Requirements: 2.3_

  - [x] 2.3 Implement MySQL-priority dual-write logic for each entity
    - **CRITICAL**: For EACH wrapper class created in task 2.2, implement the exact dual-write flow:
    - **STEP-BY-STEP DUAL-WRITE FLOW** (implement this exact sequence for every write operation):
      1. **Check feature flag**: Use the feature flag system from task 1.4 to read `dual_write_enabled` flag
      2. **Single-write mode**: If `dual_write_enabled = false`, call MySQL repository only and return (existing behavior)
      3. **Dual-write mode**: If `dual_write_enabled = true`, proceed with dual-write flow:
         a. **MySQL write first**: Call MySQL repository write method and capture result
         b. **Handle MySQL failure**: If MySQL write fails, throw error immediately (do not attempt DynamoDB write)
         c. **Extract generated ID**: Get the auto-generated ID from MySQL result (e.g., user.id, product.id)
         d. **Prepare DynamoDB data**: Use the MySQL-generated ID as the primary key for DynamoDB write
         e. **DynamoDB write**: Call DynamoDB repository write method with the MySQL-generated ID
         f. **Handle DynamoDB failure**: If DynamoDB write fails, log detailed error but return MySQL result (do not fail the operation)
    - **EXPLICIT OPERATIONS**: Implement dual-write for ALL write operations:
      - Create operations (INSERT)
      - Update operations (UPDATE)
      - Delete operations (DELETE)
      - Any other write operations specific to each entity
    - **ID PRESERVATION**: Ensure MySQL-generated IDs are used as DynamoDB primary keys for consistency
    - **COMMIT**: Commit dual-write logic with message "stage-05 task 2.3: Implement MySQL-priority dual-write logic for each entity"
    - _Requirements: 2.1, 2.2_

  - [x] 2.4 Add comprehensive logging for dual-write operations
    - **CRITICAL**: Add detailed logging to EVERY dual-write wrapper for debugging and monitoring
    - **LOGGING REQUIREMENTS**: For each dual-write operation, log:
      - **Operation start**: Entity type, operation type (CREATE/UPDATE/DELETE), correlation ID
      - **MySQL success**: "MySQL write successful for {EntityType} ID {id}"
      - **DynamoDB attempt**: "Attempting DynamoDB write for {EntityType} ID {id}"
      - **DynamoDB success**: "DynamoDB write successful for {EntityType} ID {id}"
      - **DynamoDB failure**: "DynamoDB write failed for {EntityType} ID {id}: {error details}"
    - **ERROR DETAILS**: When DynamoDB writes fail, log:
      - Full error message and stack trace
      - Entity data that failed to write
      - MySQL ID that was successfully generated
      - Timestamp and correlation ID for tracking
    - **CORRELATION IDs**: Generate unique correlation ID for each dual-write operation to track across both databases
    - **COMMIT**: Commit dual-write logging with message "stage-05 task 2.4: Add comprehensive logging for dual-write operations"
    - _Requirements: 2.4_

  - [x] 2.5 Test dual-write functionality for every entity
    - **CRITICAL**: Test dual-write functionality systematically for EACH entity identified in task 2.1
    - **ENTITY-BY-ENTITY TESTING**: For each entity wrapper, test:
      - **Flag disabled**: Use feature flag system to set `dual_write_enabled = false`, verify only MySQL write occurs
      - **Flag enabled**: Use feature flag system to set `dual_write_enabled = true`, verify both MySQL and DynamoDB writes occur
      - **Flag integration**: Verify wrapper correctly reads flag values from the feature flag system implemented in task 1.4
      - **ID preservation**: Verify MySQL-generated ID is used as DynamoDB primary key
      - **MySQL failure**: Verify operation fails completely when MySQL write fails
      - **DynamoDB failure**: Verify operation succeeds with MySQL result when DynamoDB write fails
    - **OPERATION TESTING**: Test ALL write operations for each entity:
      - Create operations (verify new records appear in both databases)
      - Update operations (verify changes appear in both databases)
      - Delete operations (verify deletions occur in both databases)
    - **DATA CONSISTENCY**: After each test, verify:
      - Data exists in MySQL with correct values
      - Data exists in DynamoDB with same ID and equivalent values
      - No orphaned records in either database
    - **COMPLETENESS VERIFICATION**: Create checklist showing all entities and operations tested
    - **COMMIT**: Commit dual-write testing with message "stage-05 task 2.5: Test dual-write functionality for every entity"
    - _Requirements: 2.5_

  - [x] 2.6 Update application to use dual-write wrappers
    - **CRITICAL**: Replace existing repository usage with dual-write wrappers throughout the application
    - **DEPENDENCY INJECTION**: Update dependency injection configuration to:
      - Inject dual-write wrappers instead of direct MySQL repositories
      - Ensure wrappers receive both MySQL and DynamoDB repository instances
      - Maintain same interface contracts so application code doesn't change
    - **SERVICE LAYER**: Update service classes to use dual-write wrappers:
      - Replace direct repository calls with wrapper calls
      - Ensure all write operations go through dual-write logic
      - Verify no direct MySQL repository usage remains for write operations
    - **INTEGRATION TESTING**: Test complete application flow:
      - Make API calls that trigger write operations
      - Verify dual-write behavior works end-to-end
      - Check that both databases receive the data correctly
    - **COMMIT**: Commit application integration with message "stage-05 task 2.6: Update application to use dual-write wrappers"
    - _Requirements: 2.5_

- [x] 3. BACKEND: Implement dual-read functionality with comprehensive validation
  - [x] 3.1 Create dual-read wrapper infrastructure
    - Create wrapper classes that support dual-read operations with flag-based routing
    - Implement read target routing (MySQL, dual, DynamoDB) based on feature flags
    - Set up infrastructure for parallel reads from both databases when in dual-read mode
    - **CRITICAL**: Run tests before and after each implementation step
    - **COMMIT**: Commit dual-read infrastructure with message "stage-05 task 3.1: Create dual-read wrapper infrastructure"
    - _Requirements: 3.1_

  - [x] 3.2 Implement dual-read verification logic
    - **CRITICAL**: Implement dual-read verification logic that compares results by attribute names, not string comparison
    - Create data validator that compares MySQL and DynamoDB results attribute by attribute
    - Focus on attribute names and values rather than object structure or formatting
    - Handle cases where one result is null and the other is not
    - **COMMIT**: Commit dual-read verification with message "stage-05 task 3.2: Implement dual-read verification logic"
    - _Requirements: 3.1, 3.2_

  - [x] 3.3 Implement error handling for data discrepancies
    - **CRITICAL**: Handle discrepancies with proper error reporting that includes detailed differences
    - Raise clear errors when dual-read validation fails, including specific attribute differences
    - Log detailed comparison results including both MySQL and DynamoDB data
    - Provide actionable error messages that help identify the source of discrepancies
    - **COMMIT**: Commit error handling with message "stage-05 task 3.3: Implement error handling for data discrepancies"
    - _Requirements: 3.3, 3.4_

  - [x] 3.4 Test dual-read validation thoroughly
    - Test dual-read scenarios with identical data to verify validation passes
    - Test scenarios with different data to verify validation properly detects differences
    - Test edge cases including null values, empty strings, and different data types
    - **CRITICAL**: Test all read scenarios and validation logic thoroughly
    - **COMMIT**: Commit dual-read testing with message "stage-05 task 3.4: Test dual-read validation thoroughly"
    - _Requirements: 3.5_

- [x] 4. BACKEND: Implement and validate all 5 migration phases
  - **FEATURE FLAG CONTROL**: All migration phases are controlled by the feature flag system implemented in task 1
  - **PHASE TRANSITIONS**: Use feature flags to control which phase the system is in and what behavior to exhibit
  - [x] 4.1 Implement Phase 1 (MySQL Only) and Phase 5 (DynamoDB Only)
    - Implement Phase 1: Write to MySQL, Read from MySQL (baseline state)
    - Implement Phase 5: Write to DynamoDB, Read from DynamoDB (final state)
    - Test both phases thoroughly to ensure they work as single-database operations
    - Verify that switching between these phases works correctly
    - **COMMIT**: Commit phase 1 and 5 implementation with message "stage-05 task 4.1: Implement Phase 1 (MySQL Only) and Phase 5 (DynamoDB Only)"
    - _Requirements: 5.1_

  - [x] 4.2 Implement Phase 2 (Dual Write + MySQL Read) and Phase 4 (Dual Write + DynamoDB Read)
    - Implement Phase 2: Dual Writes, Read from MySQL (safety phase)
    - Implement Phase 4: Dual Writes, Read from DynamoDB (transition phase)
    - Test that dual-write functionality works correctly in both phases
    - Verify that read operations use the correct database in each phase
    - **COMMIT**: Commit phase 2 and 4 implementation with message "stage-05 task 4.2: Implement Phase 2 (Dual Write + MySQL Read) and Phase 4 (Dual Write + DynamoDB Read)"
    - _Requirements: 5.1_

  - [x] 4.3 Implement Phase 3 (Dual Write + Dual Read) with validation
    - Implement Phase 3: Dual Writes, Read from both databases with validation (validation phase)
    - Enable comprehensive data validation during dual-read operations
    - Test that validation properly detects and reports data inconsistencies
    - Verify that this phase provides the most comprehensive data integrity checking
    - **COMMIT**: Commit phase 3 implementation with message "stage-05 task 4.3: Implement Phase 3 (Dual Write + Dual Read) with validation"
    - _Requirements: 5.1_

  - [x] 4.4 Create comprehensive user guide and documentation
    - **CRITICAL**: Create comprehensive user guide in markdown format explaining all 5 migration scenarios
    - Provide clear step-by-step instructions for transitioning between phases
    - Document rollback procedures for each phase
    - Include troubleshooting guidance for common issues and error scenarios
    - **COMMIT**: Commit user guide with message "stage-05 task 4.4: Create comprehensive user guide and documentation"
    - _Requirements: 5.3_

- [ ] 5. BACKEND: Create API endpoints and super admin system
  - [ ] 5.1 Create explicit flag management and migration control APIs
    - **CRITICAL**: Create comprehensive API endpoints for feature flag and migration control:
      - `GET /admin/flags/status` - Get current feature flag status and migration phase
      - `POST /admin/flags/set` - Set individual feature flags (dual_write, dual_read, etc.)
      - `POST /admin/migration/phase` - Change migration phase (1-5) with validation
      - `GET /admin/migration/status` - Get detailed migration status including validation results
      - `POST /admin/migration/validate` - Trigger manual data validation between databases
      - `GET /admin/migration/logs` - Get migration operation logs and error details
      - `POST /admin/migration/rollback` - Rollback to previous migration phase
    - **CRITICAL**: All APIs must require super admin authentication
    - Implement comprehensive input validation and error handling for all endpoints
    - Add detailed logging for all flag and migration operations
    - **CRITICAL**: Test all API endpoints with proper authentication and error scenarios
    - **COMMIT**: Commit flag management APIs with message "stage-05 task 5.1: Create explicit flag management and migration control APIs"
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 5.2 Add super admin database field and management system
    - **CRITICAL**: Create database migration to add `super_admin` BOOLEAN field to users table
    - Add database index for the super_admin field for performance
    - Update User model interface to include `super_admin` field
    - Update UserRepository to include super_admin in mapDbRowToUser method
    - Implement promoteToSuperAdmin and demoteFromSuperAdmin methods in UserRepository
    - Create SuperAdminController with API endpoints for managing super admin users:
      - `POST /admin/users/:id/promote` - Promote user to super admin
      - `POST /admin/users/:id/demote` - Remove super admin privileges
      - `GET /admin/users/super-admins` - List all super admin users
    - Add authentication middleware to protect all admin API routes with super admin check
    - **CRITICAL**: Test database migration and super admin promotion/demotion functionality
    - **COMMIT**: Commit super admin system with message "stage-05 task 5.2: Add super admin database field and management system"
    - _Requirements: 6.6, 6.7_

- [x] 6. FRONTEND: Create React admin interface for migration control
  - [x] 6.1 Create super admin frontend interface for migration control
    - **SCOPE**: Work exclusively in the `/frontend` project folder - this is a React frontend task
    - **CRITICAL**: Explore the frontend folder structure and understand existing React patterns and architecture
    - Create a hidden admin page accessible only to super admins at `/admin/migration-control`
    - Implement frontend authentication to restrict access to users with `super_admin: true`
    - Build React components that interface with the explicit migration API endpoints from task 5.1:
      - Flag status display using `GET /admin/flags/status`
      - Flag control interface using `POST /admin/flags/set`
      - Migration phase controls using `POST /admin/migration/phase`
      - Validation triggers using `POST /admin/migration/validate`
      - Log viewer using `GET /admin/migration/logs`
      - Rollback controls using `POST /admin/migration/rollback`
    - Add real-time status display showing current phase, flags, and validation statistics
    - Create intuitive controls for phase transitions and manual feature flag management
    - Implement validation error viewing and validation enable/disable controls
    - Follow existing frontend architecture, styling, and component patterns
    - **CRITICAL**: Do not add this page to main navigation - it should be hidden and accessed directly
    - **COMMIT**: Commit React admin interface with message "stage-05 task 6.1: Create super admin frontend interface for migration control"
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.8_

- [x] 7. E2E TESTING: Final testing and validation of all migration scenarios
  - [x] 7.1 Final testing and validation of all migration scenarios
    - **CRITICAL**: Test all flag combinations and validate rollback capabilities
    - Test the complete migration flow from Phase 1 through Phase 5
    - Test rollback scenarios from each phase back to previous phases
    - Verify that all migration scenarios work correctly with comprehensive logging
    - Test super admin database field migration and user promotion/demotion
    - Test super admin frontend interface with all migration controls
    - Validate authentication and authorization for admin interface
    - **CRITICAL**: Provide final testing of all migration scenarios including frontend controls
    - **COMMIT**: Commit final E2E testing with message "stage-05 task 7.1: Final testing and validation of all migration scenarios"
    - _Requirements: 5.4, 5.5, 6.6, 6.7, 6.8_

## Output Validation Checklist

Before marking this stage complete, verify:
- [ ] Backend-based feature flag system is implemented and working
- [ ] Dual-write functionality prioritizes MySQL and preserves ID generation
- [ ] Dual-read validation compares results by attribute names with proper error reporting
- [ ] Web interface is created without modifying existing CSS or breaking functionality
- [ ] All 5 migration phases are implemented and tested thoroughly
- [ ] Comprehensive logging is implemented for all DynamoDB operations
- [ ] User guide is created with step-by-step instructions for all phases
- [ ] All flag combinations have been tested with rollback capabilities validated
- [ ] Database migration adds super_admin field to users table successfully
- [ ] Super admin promotion and demotion functionality is working correctly
- [ ] Super admin frontend interface is implemented with proper authentication
- [ ] Hidden admin page provides full control over migration API endpoints
- [ ] Real-time status display and validation controls are working correctly
- [ ] No existing functionality has been broken by the feature flag implementation

## Critical Execution Guidelines

**⚠️ CRITICAL TEST EXECUTION GATES**:
- **NEVER** make changes to existing test cases
- **NEVER** create Mock tests or use Mock data
- **ALWAYS** run tests before making any code changes
- **ALWAYS** run tests after each substantive change
- Use real databases (MySQL and DynamoDB Local) for all testing

**Implementation Methodology**:
- **Wrapper Approach**: Add wrappers on top of existing database logic, don't modify existing logic
- **CSS Preservation**: DO NOT modify existing CSS configurations to avoid breaking functionality
- **MySQL Priority**: Always write to MySQL first in dual-write scenarios to preserve ID generation
- **Attribute-Based Validation**: Compare dual-read results by attribute names, not string comparison

**Migration Phase Requirements**:
1. **Phase 1**: Write to MySQL, Read from MySQL
2. **Phase 2**: Dual Writes, Read from MySQL
3. **Phase 3**: Dual Writes, Read from both (with validation)
4. **Phase 4**: Dual Writes, Read from DynamoDB
5. **Phase 5**: Write to DynamoDB, Read from DynamoDB

## Troubleshooting Guide

**Feature Flag Issues**:
- Verify that cookies are being set and read correctly
- Check that flag configurations are properly validated
- Ensure that flag changes are reflected in application behavior
- Test flag persistence across browser sessions

**Dual-Write Issues**:
- Verify that MySQL writes complete successfully before DynamoDB writes
- Check that MySQL-generated IDs are properly preserved and used
- Ensure that DynamoDB write failures don't cause MySQL rollbacks
- Validate that comprehensive logging is working for all operations

**Dual-Read Issues**:
- Verify that both databases are being queried in parallel
- Check that data validation is comparing attributes correctly
- Ensure that validation errors provide detailed difference information
- Test that validation works with various data types and edge cases

**Web Interface Issues**:
- Verify that existing CSS and styling are not being modified
- Check that new menu items integrate properly with existing navigation
- Ensure that form submissions are properly updating feature flags
- Test that the interface works across different browsers and devices

**Migration Phase Issues**:
- Verify that each phase implements the correct read/write behavior
- Check that transitions between phases work smoothly
- Ensure that rollback procedures work correctly for each phase
- Test that logging and monitoring work properly in all phases