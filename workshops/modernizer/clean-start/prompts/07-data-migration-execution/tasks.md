# Data Migration Execution - Tasks

- [ ] 1. Execute data migration script.
  - [ ] 1.1 Validate migration contract and infrastructure inputs
    - **INPUT**: Use artifacts/stage-02/migrationContract.json from the data modeling stage and deployed infrastructure from infrastructure deployment stage
    - Ask the user to provide AWS credentials to add as environment variables
    - Check AWS region consistency between infrastructure deployment and planned Glue jobs
    - Execute using python the file `tools/contract_driven_migration_glue_mcp.py`
    - Validate that all required fields are present in the migration contract
    - _Requirements: 1.1, 3.3_