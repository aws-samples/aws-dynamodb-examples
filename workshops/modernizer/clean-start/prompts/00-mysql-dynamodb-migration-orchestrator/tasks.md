# MySQL to DynamoDB Migration Orchestrator - Tasks

- [ ] 1. Execute MySQL Analysis Stage
  - Navigate to `prompts/01-mysql-analysis/` spec
  - Execute the complete 01-mysql-analysis spec (requirements → design → tasks)
  - Validate output: Modular artifacts exist in `artifacts/stage-01/` and contain complete schema analysis
  - Confirm all MySQL schema, relationships, and access patterns are documented
  - _Requirements: 1.1, 1.2_

- [ ] 2. Execute DynamoDB Data Modeling Stage
  - Navigate to `prompts/02-dynamodb-data-modeling/` spec
  - Provide stage-01 modular artifacts (`artifacts/stage-01/`) as input to the data modeling process
  - Execute the complete 02-dynamodb-data-modeling spec
  - Validate outputs: `dynamodb_data_model.md`, `dynamodb_requirement.md` and `migrationContract.json` exist
  - **CRITICAL**: Verify `migrationContract.json` follows exact format specified in data modeling spec
  - _Requirements: 1.3, 2.1, 2.2_

- [ ] 3. Execute Dual-Database Abstraction Stage
  - Navigate to `prompts/03-dual-database-abstraction/` spec
  - Provide backend codebase path as input (backend/ folder only)
  - Execute the complete 03-dual-database-abstraction spec (discovery-driven process)
  - Validate output: Backend has dual-database abstraction layer with global feature flags
  - Confirm all existing backend tests still pass with dual-database abstraction layer
  - _Requirements: 1.4, 2.3_

- [ ] 4. Execute DynamoDB Implementation Stage
  - Navigate to `prompts/04-dynamodb-implementation/` spec
  - Provide `Stage3_DataModel.md` and abstracted codebase as inputs
  - Execute the complete 04-dynamodb-implementation spec
  - Validate output: Complete DynamoDB implementation with passing tests
  - Confirm implementation follows data model specifications exactly
  - _Requirements: 1.5, 2.4_

- [ ] 5. Execute Feature Flags System Stage
  - Navigate to `prompts/05-feature-flags-system/` spec
  - Provide completed DAL implementations as input
  - Execute the complete 05-feature-flags-system spec
  - Validate output: Web interface for controlling 5 migration phases
  - Test all migration scenarios: MySQL-only → dual-write → dual-read → DynamoDB-only
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 6. Execute Infrastructure Deployment Stage
  - Navigate to `prompts/06-infrastructure-deployment/` spec
  - Provide `migrationContract.json` as input
  - Execute the complete 06-infrastructure-deployment spec
  - Validate output: DynamoDB tables deployed with proper configuration
  - Confirm all tables, GSIs, and monitoring are properly configured
  - _Requirements: 3.1, 3.2_

- [ ] 7. Execute Data Migration Stage
  - Navigate to `prompts/07-data-migration-execution/` spec
  - Provide deployed infrastructure and migration contract as inputs
  - Execute the complete 07-data-migration-execution spec
  - Validate output: Data successfully migrated with validation reports
  - Confirm data integrity and completeness through validation checks
  - _Requirements: 3.3, 3.4, 3.5_

- [ ] 8. Generate Migration Summary and Documentation
  - Compile comprehensive migration report including:
    - Summary of all stages completed
    - Performance metrics and validation results
    - Rollback procedures and recovery guidance
    - Lessons learned and operational recommendations
  - Create final documentation package for ongoing maintenance
  - Provide cleanup scripts for temporary resources
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

## Stage Validation Checklist

Before proceeding to the next stage, verify:
- [ ] All required input artifacts are available and properly formatted
- [ ] Current stage spec has been executed completely (all tasks marked complete)
- [ ] All output artifacts are generated in correct format and location
- [ ] Tests pass (where applicable)
- [ ] Documentation is complete and accurate
- [ ] No blocking issues or errors remain unresolved

## Troubleshooting Guide

**If a stage fails:**
1. Review the specific stage's requirements and design documents
2. Check that all input dependencies are properly formatted
3. Verify the execution environment meets the stage's prerequisites
4. Consult the stage-specific troubleshooting guidance
5. If needed, restart from the failed stage after resolving issues

**Common Issues:**
- Missing or incorrectly formatted input artifacts
- Environment setup issues (MCP server, DynamoDB Local, etc.)
- Test failures due to environment configuration
- AWS permissions or region configuration problems