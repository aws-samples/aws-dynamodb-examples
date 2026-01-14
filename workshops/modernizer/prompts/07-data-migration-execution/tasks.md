# Data Migration Execution - Tasks

**IMPORTANT**: 
- **Commit changes frequently** throughout this stage to maintain a clean Git history
- **Use `git -P`** to avoid interactive prompts
- **Mark tasks as completed** by changing `[ ]` to `[x]` as you finish each task
- **Commit after each major task completion** with descriptive messages
- **Update the tasks.md file** itself when marking tasks complete and commit those changes too
- **Use single working log**: Use `artifacts/stage-07/07_working_log.md` throughout the entire stage (not individual logs per subtask)
- **DO NOT MODIFY THE CONTENT OF THIS FILE**: Only add a [x] mark to complete the task, for tracking purposes.
- Consult the `design.md` document for detailed code examples and references on these tasks. 

- [ ] 1. Generate MySQL views for data transformation
  - [ ] 1.1 Validate migration contract and infrastructure inputs
    - **INPUT**: Use migrationContract.json from the data modeling stage and deployed infrastructure from infrastructure deployment stage
    - Verify that the migration contract file exists and is properly formatted
    **CRITICAL**: Create DynamoDB tables in on-demand billing mode based on migration contract specifications
    - Use migration contract to create all tables with proper GSI configurations
    - Check AWS region consistency between infrastructure deployment and planned Glue jobs
    - _Requirements: 1.1, 3.3_

  - [ ] 1.2 Generate MySQL views using the provided script
    - **CRITICAL**: Run generate_mysql_views.py script for each DynamoDB table defined in the migration contract
    - Use the migration contract as input to the script with proper parameters
    - Ensure the script processes all table definitions and handles denormalized attributes correctly
    - **CRITICAL**: Create a single .sql file containing all resulting SQL statements
    - Validate that the generated SQL is syntactically correct and follows MySQL standards
    - _Requirements: 1.1, 1.2_

  - [ ] 1.3 Execute generated SQL against MySQL database
    - **CRITICAL**: Run the generated SQL against the user's MySQL database using MCP server connectivity
    - Use MCP server tools for secure database connectivity and SQL execution
    - Verify that all views are created successfully without errors
    - _Requirements: 1.3, 1.4_

  - [ ] 1.4 Validate view creation and data transformation
    - Test each generated view to ensure it returns data in the expected format
    - Verify that denormalized data is properly handled with correct joins
    - **CRITICAL**: Properly handle joins and data denormalization as specified in the contract
    - Check that data types are correctly mapped and transformed
    - Validate that the views exclude soft-deleted records and apply appropriate filters
    - _Requirements: 1.5_

- [ ] 2. Execute contract-driven migration using Data Processing MCP server
  - [ ] 2.1 Prepare migration environment and validate MCP server availability
    - Verify that AWS credentials are properly configured with sufficient permissions for Glue operations
    - Confirm that the target AWS region matches the infrastructure deployment region
    - **CRITICAL**: Ensure AWS region consistency between infrastructure and Glue jobs
    - Validate that config.json file is properly configured with migration contract path, AWS settings, and MySQL discovery parameters 
    - Confirm that MCP servers have proper permissions and can execute required operations
    - _Requirements: 2.2, 3.3_

  - [ ] 2.2 Glue Job generation and prepareation. 
    - Use a template based approach `tools/glue_script_template.py` to generate Glue scripts for each table
    - Apply dynamic configuration from migration contract and configuration file. 
    - Upload the generated python scripts to S3 using the Glue MCP server
    - Create a job with the previously uploaded file to S3, with the respective parameters ensuring the database connection `mysql-modernizer-connection` is used. 
    - Confirm that the target AWS region matches the infrastructure deployment region
    - **CRITICAL**: Ensure AWS region consistency between infrastructure and Glue jobs
    - Validate that config.json file is properly configured with migration contract path, AWS settings, and MySQL discovery parameters 
    - Confirm that MCP servers have proper permissions and can execute required operations
    - Repeat this process as many times as required as specified on the `migrationContract.json`
    - _Requirements: 2.2, 3.3_

  - [ ] 2.3 Monitor migration execution and handle errors
    - Track progress through each phase: MySQL view creation, DynamoDB table creation, Glue job execution
    - Verify that the script properly handles MySQL connection discovery and database connectivity
    - Ensure that DynamoDB tables are created with correct schema including GSIs and key structures
    - Monitor Glue job creation, script upload to S3, and job execution via MCP server calls
    - **CRITICAL**: Validate that error handling and retry mechanisms are working properly throughout the process
    - _Requirements: 2.4, 3.1, 3.2_

- [ ] 3. Execute data migration with monitoring and validation
  - [ ] 3.1 Execute migration jobs with comprehensive monitoring
    - Start all configured Glue ETL jobs and monitor their execution progress
    - **CRITICAL**: Provide real-time progress tracking and status updates
    - Monitor resource utilization and performance metrics during execution
    - **CRITICAL**: Log detailed error information and provide troubleshooting guidance
    - Set up alerts for job failures or performance issues
    - _Requirements: 3.1, 3.2_

  - [ ] 3.2 Implement incremental migration with data validation
    - **CRITICAL**: Perform incremental data migration with conditional writes to prevent data corruption
    - Use DynamoDB conditional writes to prevent overwriting existing data
    - Implement data validation checks during the migration process
    - Monitor data consistency and integrity throughout the migration
    - **CRITICAL**: Provide data validation and integrity checks throughout the process
    - _Requirements: 2.3, 2.5_

  - [ ] 3.3 Monitor migration progress and handle errors
    - Track migration progress for each table and provide regular status updates
    - Monitor CloudWatch metrics for Glue job performance and DynamoDB table metrics
    - Handle migration errors gracefully with appropriate retry and recovery mechanisms
    - **CRITICAL**: Use MCP servers for database connectivity where available
    - Provide detailed error reporting and troubleshooting guidance for any issues
    - _Requirements: 3.4_

- [ ] 4. Validate migration completeness and data integrity
  - [ ] 4.1 Perform comprehensive data validation
    - Compare record counts between MySQL source tables and DynamoDB target tables
    - Validate a statistical sample of migrated records for data accuracy and completeness
    - Check that all required attributes are properly mapped and transformed
    - Verify that denormalized data is correctly joined and represented
    - Test that all access patterns from the migration contract work with migrated data
    - _Requirements: 2.5_

  - [ ] 4.2 Execute data integrity checks
    - Validate that primary key constraints are maintained in DynamoDB
    - Check that unique constraints are properly enforced through lookup tables
    - Verify that referential integrity is maintained for denormalized data
    - Test that all GSIs contain the expected data and support required access patterns
    - Perform end-to-end testing of critical application workflows with migrated data
    - _Requirements: 2.5_

  - [ ] 4.3 Generate validation reports and metrics
    - Create detailed validation reports showing migration success rates and data integrity scores
    - Document any data discrepancies found during validation with recommended remediation
    - Generate performance metrics for the migration process including throughput and latency
    - Create summary reports for stakeholders showing migration completion status
    - Provide recommendations for any post-migration optimizations or corrections needed
    - _Requirements: 3.5_

- [ ] 5. Generate comprehensive migration reports and documentation
  - [ ] 5.1 Create migration completion reports
    - **CRITICAL**: Generate comprehensive migration completion and validation reports
    - Document total records migrated, migration duration, and performance metrics
    - Include data integrity scores and validation results for each table
    - Provide detailed error logs and resolution status for any issues encountered
    - Create executive summary reports for project stakeholders
    - _Requirements: 3.5_

  - [ ] 5.2 Document post-migration procedures and recommendations
    - Create operational runbooks for ongoing DynamoDB table management
    - Document monitoring and alerting procedures for production operations
    - Provide recommendations for performance optimization and cost management
    - Create troubleshooting guides for common post-migration issues
    - Document rollback procedures and disaster recovery plans
    - _Requirements: 3.5_

  - [ ] 5.3 Provide cleanup and maintenance guidance
    - Document cleanup procedures for temporary migration resources (Glue jobs, S3 buckets, etc.)
    - Provide guidance for removing MySQL views and temporary database objects
    - Create maintenance schedules for ongoing DynamoDB operations (backups, monitoring, etc.)
    - Document capacity planning and scaling procedures for production workloads
    - Provide cost optimization recommendations based on actual migration results
    - _Requirements: 3.5_

## Output Validation Checklist

Before marking this stage complete, verify:
- [ ] MySQL views are generated and executed using the `tools/generate_mysql_views.py` script and using the MySQL CP server
- [ ] MySQL connection is discovered automatically via Data Processing MCP server
- [ ] DynamoDB tables are created via MCP server based on migration contract specifications
- [ ] AWS Glue ETL jobs are created and executed using contract_driven_migration_glue_mcp.py
- [ ] AWS region consistency is maintained between infrastructure and Glue jobs
- [ ] Complete migration process is executed via Data Processing MCP server with comprehensive monitoring
- [ ] All MCP server calls (MySQL, DynamoDB, Glue, S3) are executed successfully
- [ ] Data validation confirms successful migration with integrity checks
- [ ] Migration completion reports are generated with detailed metrics and recommendations
- [ ] Post-migration documentation and operational guidance are provided

## DynamoDB Table Creation Instructions
  
**Step-by-Step Process for Creating DynamoDB Tables from Migration Contract**:
  
### 1. Read Migration Contract
```bash
# Locate and read the migration contract
cat artifacts/stage-02/migrationContract.json
```
  
### 2. Create Tables Using AWS CLI
For each table in the migration contract, create DynamoDB tables in **on-demand billing mode**:
  
#### Users Table (Multi-entity with 3 GSIs)
```bash
aws dynamodb create-table \
--table-name Users \
--attribute-definitions \
AttributeName=PK,AttributeType=S \
AttributeName=SK,AttributeType=S \
AttributeName=GSI1PK,AttributeType=S \
AttributeName=GSI1SK,AttributeType=S \
AttributeName=GSI2PK,AttributeType=S \
AttributeName=GSI2SK,AttributeType=S \
AttributeName=GSI3PK,AttributeType=S \
AttributeName=GSI3SK,AttributeType=S \
--key-schema \
AttributeName=PK,KeyType=HASH \
AttributeName=SK,KeyType=RANGE \
--global-secondary-indexes \
'IndexName=GSI1,KeySchema=[{AttributeName=GSI1PK,KeyType=HASH},{AttributeName=GSI1SK,KeyType=RANGE}],Projection={ProjectionType=ALL}' \
'IndexName=GSI2,KeySchema=[{AttributeName=GSI2PK,KeyType=HASH},{AttributeName=GSI2SK,KeyType=RANGE}],Projection={ProjectionType=ALL}' \
'IndexName=GSI3,KeySchema=[{AttributeName=GSI3PK,KeyType=HASH},{AttributeName=GSI3SK,KeyType=RANGE}],Projection={ProjectionType=ALL}' \
--billing-mode PAY_PER_REQUEST \
--region us-west-2
```
  
#### Products Table (Single-entity with 2 GSIs)
```bash
aws dynamodb create-table \
--table-name Products \
--attribute-definitions \
AttributeName=PK,AttributeType=S \
AttributeName=SK,AttributeType=S \
AttributeName=GSI1PK,AttributeType=S \
AttributeName=GSI1SK,AttributeType=S \
AttributeName=GSI2PK,AttributeType=S \
AttributeName=GSI2SK,AttributeType=S \
--key-schema \
AttributeName=PK,KeyType=HASH \
AttributeName=SK,KeyType=RANGE \
--global-secondary-indexes \
'IndexName=GSI1,KeySchema=[{AttributeName=GSI1PK,KeyType=HASH},{AttributeName=GSI1SK,KeyType=RANGE}],Projection={ProjectionType=ALL}' \
'IndexName=GSI2,KeySchema=[{AttributeName=GSI2PK,KeyType=HASH},{AttributeName=GSI2SK,KeyType=RANGE}],Projection={ProjectionType=ALL}' \
--billing-mode PAY_PER_REQUEST \
--region us-west-2
```
  
#### Categories Table (Single-entity with 1 GSI)
```bash
aws dynamodb create-table \
--table-name Categories \
--attribute-definitions \
AttributeName=PK,AttributeType=S \
AttributeName=SK,AttributeType=S \
AttributeName=GSI1PK,AttributeType=S \
AttributeName=GSI1SK,AttributeType=S \
--key-schema \
AttributeName=PK,KeyType=HASH \
AttributeName=SK,KeyType=RANGE \
--global-secondary-indexes \
'IndexName=GSI1,KeySchema=[{AttributeName=GSI1PK,KeyType=HASH},{AttributeName=GSI1SK,KeyType=RANGE}],Projection={ProjectionType=ALL}' \
--billing-mode PAY_PER_REQUEST \
--region us-west-2
```
  
### 3. Verify Table Creation
```bash
# List all tables to verify creation
aws dynamodb list-tables --region us-west-2
  
# Check specific table status
aws dynamodb describe-table --table-name Users --region us-west-2
aws dynamodb describe-table --table-name Products --region us-west-2
aws dynamodb describe-table --table-name Categories --region us-west-2
```
  
**Important Notes**:
- **ALWAYS use PAY_PER_REQUEST (on-demand) billing mode** as specified
- **Ensure region consistency** - all tables must be in us-west-2 region
- **Wait for ACTIVE status** before proceeding with migration
- **Verify GSI creation** - each table must have all specified Global Secondary Indexes

## Critical Execution Guidelines

**Script Execution Requirements**:
- **ALWAYS** use data-migration-tools/contract_driven_migration_glue_mcp.py for complete migration execution
- **VERIFY** that config.json is properly configured with migration contract path and AWS settings
- **ENSURE** that Data Processing MCP server (Glue MCP) is available and accessible
- **VALIDATE** that the script handles all phases: MySQL views, DynamoDB tables, and Glue jobs via MCP

**Data Integrity Requirements**:
- **ALWAYS** use conditional writes to prevent data corruption during migration
- **ALWAYS** perform comprehensive data validation throughout the process
- **VERIFY** that record counts match between source and target systems
- **VALIDATE** that data transformations are applied correctly according to the contract

**Monitoring and Error Handling**:
- **ALWAYS** provide real-time progress tracking and status updates
- **ALWAYS** log detailed error information for troubleshooting
- **IMPLEMENT** comprehensive retry mechanisms for transient failures
- **ENSURE** that all errors are properly handled and documented

**Regional Consistency**:
- **VERIFY** that AWS region is consistent between infrastructure deployment and Glue jobs
- **ENSURE** that all AWS resources are created in the same region
- **VALIDATE** that cross-region dependencies are properly handled if they exist

## Troubleshooting Guide

**Contract-Driven Migration Script Issues**:
- Verify that config.json exists and contains proper migration contract path and AWS configuration
- Check that Data Processing MCP server (Glue MCP) is running and accessible
- Ensure that the migration contract file is properly formatted and accessible
- Validate that MySQL connection discovery parameters are correctly configured in config.json

**MCP Server Connectivity Issues**:
- Verify that MySQL MCP server can discover and connect to the database automatically
- Check that AWS credentials have sufficient permissions for DynamoDB, Glue, and S3 operations
- Ensure that all MCP server calls are executing successfully (MySQL, DynamoDB, Glue, S3)
- Validate that the script properly handles MCP server responses and error conditions

**AWS Glue Job Issues via MCP**:
- Monitor Glue job creation and execution through MCP server calls
- Check that Glue scripts are properly uploaded to S3 via MCP server
- Verify that Glue jobs are created with correct IAM roles and configurations
- Ensure that Glue job execution completes successfully with proper error handling

**Data Migration Issues**:
- Monitor CloudWatch logs for detailed error information from Glue jobs
- Check DynamoDB table metrics for throttling or capacity issues
- Verify that conditional writes are working properly to prevent data corruption
- Ensure that data transformations are being applied correctly

**Validation Issues**:
- Compare record counts between source and target systems to identify discrepancies
- Check data type mappings and transformations for accuracy
- Verify that denormalized data is properly joined and represented
- Test access patterns with migrated data to ensure functionality

**Performance Issues**:
- Monitor Glue job resource utilization and adjust worker configuration if needed
- Check DynamoDB table capacity and scaling settings
- Optimize data transformation logic for better performance
- Consider parallel processing for large datasets to improve throughput