# DynamoDB Data Modeling with MCP Server - Tasks

## COMMIT FREQUENCY AND TASK COMPLETION

**IMPORTANT**: 
- **Commit changes frequently** throughout this stage to maintain a clean Git history
- **Use `git -P`** to avoid interactive prompts
- **Mark tasks as completed** by changing `[ ]` to `[x]` as you finish each task
- **Commit after each major task completion** with descriptive messages
- **Update the tasks.md file** itself when marking tasks complete and commit those changes too
- **Use single working log**: Use `artifacts/stage-02/02_working_log.md` throughout the entire stage (not individual logs per subtask)
- **DO NOT MODIFY THE CONTENT OF THIS FILE**: Only add a [x] mark to complete the task, for tracking purposes.

- [ ] 1. Analyze stage-01 artifacts and prepare comprehensive context
  - [ ] 1.1 Extract and analyze existing artifacts
    - Make sure you have a clean commit log
    - Use a temporary file called `artifacts/stage-02/02_working_log.md` to track your current work and important notes throughout this entire stage
    - Read and analyze the three essential stage-01 artifacts:
      - `artifacts/stage-01/01_1_API_access_patterns.md` - **PRIMARY SOURCE**: Backend API endpoints and access patterns that MUST be supported
      - `artifacts/stage-01/01_2_mysql_log_analysis.md` - **SUPPLEMENTAL DATA**: Performance patterns and query statistics where available
      - `artifacts/stage-01/01_3_table_structure_analysis.md` - **COMPLETE DATA MODEL**: All table structures and relationships from source database
    - **CRITICAL**: API patterns define the authoritative requirements for what must be supported
    - **IMPORTANT**: Log analysis provides performance context but may not cover all API patterns
    - **IMPORTANT**: Table structure provides the complete source data model for migration
    - Extract key entities, relationships, and access patterns from the artifacts without making any design assumptions
    - Identify current MySQL schema structure, constraints, and performance characteristics from table structure analysis
    - Document any existing bottlenecks or performance issues from the MySQL log analysis
    - **COMMIT**: Commit artifact analysis with message "stage-02-a task 1.1: Analyze stage-01 artifacts for DynamoDB modeling context"
    - **MARK COMPLETE**: Update this task to [x] and commit the tasks.md change
    - _Requirements: 1.1_

  - [ ] 1.2 Gather complete access pattern requirements with RPS estimates
    - **CRITICAL**: BEFORE creating any files, work with user to gather ALL missing information
    - **STEP 1**: Review API patterns from stage-01 and identify any missing patterns
    - **STEP 2**: Ask user specific questions about missing patterns: "I see we have a user login access pattern but no pattern to create users. Should we add one?"
    - **STEP 3**: For EVERY access pattern (existing + new), require RPS estimates and never fabricate numbers
    - **STEP 4**: Work with user to estimate RPS based on business context if not available from performance analysis
    - **STEP 5**: ONLY AFTER all information is gathered, create comprehensive access patterns analysis table with Pattern #, Description, RPS (Peak/Average), Type, Attributes, Key Requirements, and Design Considerations
    - **IMPORTANT**: Do not create any files until user has provided all RPS estimates and confirmed pattern completeness
    - **COMMIT**: Commit access pattern requirements with message "stage-02-a task 1.2: Document complete access patterns with RPS estimates"
    - **MARK COMPLETE**: Update this task to [x] and commit the tasks.md change
    - _Requirements: 1.2, 1.3_

  - [ ] 1.3 Validate requirements completeness with user
    - Review all documented access patterns for completeness
    - Confirm that every read pattern has a corresponding write pattern (and vice versa) unless user explicitly declines
    - **CRITICAL**: Present the three-tier information hierarchy clearly to user:
      - **API patterns as PRIMARY requirements (authoritative source)** - Complete list with RPS estimates
      - Table structure as COMPLETE data model (all entities and relationships)
      - Log analysis as SUPPLEMENTAL performance data (where available)
    - **USER CONFIRMATION GATE**: Ask user "Do these access patterns and requirements look complete? Are there any other patterns we should consider?"
    - Do not proceed until user explicitly confirms all patterns are captured
    - **IMPORTANT**: Do not create any intermediate context document - proceed directly to MCP server interaction in task 2.1
    - **COMMIT**: Commit requirements validation with message "stage-02-a task 1.3: Validate complete access pattern requirements with user"
    - **MARK COMPLETE**: Update this task to [x] and commit the tasks.md change
    - _Requirements: 1.4, 1.5_

- [ ] 2. Generate complete DynamoDB design using MCP server
  - [ ] 2.1 Obtain MCP server prompt and merge with prepared context
    - **STEP 1 - Get MCP Server Prompt**: Call the MCP server to retrieve its specific prompt and requirements for DynamoDB data modeling
    - **STEP 2 - Prepare Context Package**: Organize all information captured in Task 1 into a comprehensive context package:
      - **PRIMARY REQUIREMENTS - API Access Patterns**: Complete list with RPS estimates from task 1.2
      - **SOURCE DATA MODEL - Table Structure**: Complete MySQL schema from stage-01 artifacts  
      - **PERFORMANCE CONTEXT - Log Analysis**: Performance data where available from stage-01 artifacts
    - **STEP 3 - Follow MCP Server's Complete Workflow**: Follow the MCP server's prescribed workflow exactly as specified in its prompt, including creating all intermediate files it requires before the final deliverable
    - **CRITICAL**: Do not just "merge and create output" - follow the MCP server's complete step-by-step process including any intermediate steps, files, or analysis it requests
    - **CRITICAL CONTEXT HIERARCHY**: When providing context to fulfill MCP server's workflow, emphasize:
      - **API patterns as PRIMARY requirements (authoritative source)** - These define what must be supported
      - Table structure as COMPLETE data model (all entities and relationships) - This provides the source schema
      - Log analysis as SUPPLEMENTAL performance data (where available) - This provides performance context
    - **IMPORTANT**: Execute each step of the MCP server's workflow in sequence, using the prepared context to fulfill each specific requirement
    - **IMPORTANT**: Ensure any files created are placed in the `artifacts/stage-02/` folder as specified by MCP server prompt
    - **STEP 4 - MANDATORY ACCESS PATTERN VALIDATION**: After completing the MCP server workflow, perform explicit validation:
      - **CRITICAL**: Read the access patterns file created in task 1.2 (likely named `access_patterns_with_rps.md` or similar)
      - **CRITICAL**: For EACH access pattern listed in that file, verify it is explicitly addressed in the MCP-generated artifacts
      - **VALIDATION FORMAT**: Create a checklist showing:
        - Pattern #1: [Pattern Name] - ✓ Addressed in [Table Name/GSI] OR ✗ MISSING
        - Pattern #2: [Pattern Name] - ✓ Addressed in [Table Name/GSI] OR ✗ MISSING
        - Continue for ALL patterns
      - **CRITICAL**: If ANY patterns are marked as MISSING, immediately update the MCP-generated artifacts to include them
      - **CRITICAL**: Do not proceed until ALL access patterns from the requirements file are explicitly addressed
    - **EXPECTED OUTCOME**: The MCP server prompt will likely request comprehensive DynamoDB design documentation including table designs, access pattern mapping, cost analysis, and migration considerations
    - **COMMIT**: Commit complete MCP design analysis with message "stage-02-a task 2.1: Generate comprehensive DynamoDB design using MCP server prompt and prepared context"
    - **MARK COMPLETE**: Update this task to [x] and commit the tasks.md change
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1_

- [ ] 3. Validate and finalize design with user approval
  - [ ] 3.1 Validate that dynamodb_data_model.md file was properly generated
    - Verify that `dynamodb_data_model.md` file exists and was created by the MCP server
    - Check that the file contains all required sections: Design Philosophy, Table Designs, Access Pattern Mapping, Cost Estimates, Hot Partition Analysis
    - Confirm that all original access patterns are addressed in the design
    - Validate that all MySQL entities are properly mapped to DynamoDB structures
    - Verify that the MCP server's design approach is well-justified and addresses all requirements
    - If any sections are missing or incomplete, request MCP server to regenerate the file
    - **COMMIT**: Commit design validation with message "stage-02-a task 3.1: Validate MCP-generated dynamodb_data_model.md file completeness"
    - **MARK COMPLETE**: Update this task to [x] and commit the tasks.md change
    - _Requirements: 3.2, 3.3_

  - [ ] 3.2 Perform table-by-table design validation with user
    - **CRITICAL**: For EACH DynamoDB table in the design, conduct individual validation with the user
    - For each table, present:
      - **Table Purpose**: What this table stores and why it exists
      - **Source Mapping**: Which MySQL table(s) this DynamoDB table replaces or combines
      - **Partition Key Design**: Why this partition key was chosen and how it distributes data
      - **Sort Key Design**: Why this sort key was chosen and what query patterns it enables
      - **GSI Design**: Purpose of each GSI, why it's needed, and cost implications
      - **Access Patterns Served**: Which specific access patterns this table satisfies
      - **Denormalization Decisions**: If data from multiple MySQL tables is combined, explain why
    - **USER VALIDATION PER TABLE**: Ask user "Does this table design make sense? Do you understand why we're combining/splitting these MySQL tables this way?"
    - **CRITICAL**: Do not proceed to next table until user confirms understanding of current table
    - Document any user concerns or requested modifications for each table
    - **COMMIT**: Commit table-by-table validation with message "stage-02-a task 3.2: Complete table-by-table design validation with user"
    - **MARK COMPLETE**: Update this task to [x] and commit the tasks.md change
    - _Requirements: 3.4, 3.5_

  - [ ] 3.3 Review and finalize MCP-generated data model document
    - Review the `dynamodb_data_model.md` file generated by the MCP server in task 2.1
    - Validate that the MCP server included all required sections: Design Philosophy, Table Designs, Access Pattern Mapping, Cost Estimates, and Hot Partition Analysis
    - If any sections are missing or incomplete, request MCP server to enhance the document
    - Incorporate all user feedback and validation results from the table-by-table review in task 3.2
    - Make any necessary adjustments to the document based on validation findings and user concerns
    - **USER CONFIRMATION GATE**: Ask user "After reviewing each table individually, does the complete design approach look good?"
    - Do not proceed until user explicitly approves the overall design approach
    - **COMMIT**: Commit finalized data model with message "stage-02-a task 3.3: Finalize MCP-generated DynamoDB data model with table-by-table validation"
    - **MARK COMPLETE**: Update this task to [x] and commit the tasks.md change
    - _Requirements: 3.4, 3.5_

- [ ] 4. Generate migration contract
  - [x] 4.1 Generate migration contract from finalized data model using comprehensive join patterns
    - **CRITICAL**: Create `migrationContract.json` in the `artifacts/stage-02/` folder following the EXACT JSON structure specified in design document with comprehensive join pattern support
    - Use the finalized `dynamodb_data_model.md` from task 3.3 as the source for contract generation
    - Apply the standardized generation process from contracts/migration_contract_generation_guide.md:
      - Step 1: Analyze source schema and identify all relationship types
      - Step 2: Map access patterns to join requirements
      - Step 3: Select appropriate join patterns for each relationship
      - Step 4: Design table structure with pattern integration
      - Step 5: Generate contract JSON with comprehensive validation
    - Each table entry MUST include: table, type, source_table, pk, sk (optional), gsis (optional), attributes, satisfies, estimated_item_size_bytes
    - For each attribute: include type (S/N/B), source_table, source_column mappings with appropriate join pattern specifications
    - For complex relationships: MUST include proper join pattern type (self-join, foreign-key, multi-column, conditional, chain with optional chain_separator, lookup-table, json-construction) with complete transformation logic
    - For denormalized attributes: MUST include denormalized=true, justification, and join object with pattern-specific fields and validation rules
    - Implement proper unique constraint handling patterns with lookup tables as specified in the comprehensive pattern library
    - Map all table designs and access patterns from the data model document to the JSON contract format using standardized patterns
    - Validate generated contract against comprehensive validation checklist including schema compliance, data integrity, performance optimization, and access pattern coverage
    - **COMMIT**: Commit migration contract generation with message "stage-02-a task 4.1: Generate comprehensive migration contract with join patterns from finalized data model"
    - **MARK COMPLETE**: Update this task to [x] and commit the tasks.md change
    - _Requirements: 4.1, 4.2, 4.3, 7.1, 7.2, 7.3_

  - [x] 4.2 Validate migration contract completeness and accuracy using comprehensive validation framework
    - Verify that all access patterns from requirements are satisfied by designed tables and GSIs with appropriate join pattern support
    - Confirm all MySQL entities are properly mapped to DynamoDB structures using correct join pattern classifications
    - Validate JSON structure follows exact format requirements with proper join pattern specifications
    - Ensure all required fields are present and properly formatted for each join pattern type
    - Check that unique constraint handling is properly implemented with TransactWriteItems patterns as specified in the pattern library
    - Validate join pattern implementations using comprehensive validation checklist:
      - Schema compliance: JSON structure, required fields, type safety
      - Data integrity: null handling, join completeness, transformation logic
      - Performance optimization: partition distribution, GSI efficiency, item size limits
      - Access pattern coverage: all patterns satisfied, query efficiency, cost optimization
    - Verify that complex transformation scenarios are properly handled: hierarchical data, many-to-many relationships, calculated fields, time-based partitioning
    - Ensure pattern-specific validation rules are met for each join type used in the contract
    - **USER CONFIRMATION GATE**: Ask user "Does this migration contract look complete and accurate? Are all the mappings correct and do the join patterns properly handle all relational data transformations?"
    - Do not proceed until user explicitly validates the migration contract and understands the join pattern implementations
    - **COMMIT**: Commit contract validation with message "stage-02-a task 4.2: Validate comprehensive migration contract with join patterns for completeness and accuracy"
    - **MARK COMPLETE**: Update this task to [x] and commit the tasks.md change
    - _Requirements: 4.4, 4.5, 7.4, 7.5_

- [ ] 5. Finalize documentation and prepare for next stage
  - [x] 5.1 Create comprehensive documentation summary
    - Document the MCP server interaction process and key decisions made
    - Summarize all design trade-offs and rationale for chosen approach
    - Document any deviations from MCP server recommendations and reasons
    - Create troubleshooting guide for common issues identified during analysis
    - Include recommendations for monitoring and operational considerations
    - **COMMIT**: Commit documentation summary with message "stage-02-a task 5.1: Create comprehensive documentation summary"
    - **MARK COMPLETE**: Update this task to [x] and commit the tasks.md change
    - _Requirements: 5.1_

  - [x] 5.2 Validate readiness for next stage
    - Ensure `dynamodb_data_model.md` is complete with comprehensive justifications
    - Confirm `migrationContract.json` follows exact structure and includes all mappings
    - Verify that all design decisions are documented with trade-offs and rollback strategies
    - Validate that outputs provide sufficient information for stage 04 DynamoDB implementation
    - Confirm user has approved all major design decisions and migration contract
    - **COMMIT**: Commit final validation with message "stage-02-a task 5.2: Complete DynamoDB data modeling with MCP server assistance"
    - **MARK COMPLETE**: Update this task to [x] and commit the tasks.md change
    - _Requirements: 5.2_

## Output Validation Checklist

Before marking this stage complete, verify:
- [ ] All stage-01 artifacts have been analyzed and key information extracted
- [ ] All access patterns have RPS estimates (no fabricated numbers)
- [ ] User has explicitly confirmed all access patterns are captured
- [ ] MCP server has provided comprehensive design analysis with multiple alternatives
- [ ] Cost analysis includes realistic estimates based on average RPS
- [ ] Production risk assessment identifies potential issues with mitigation strategies
- [ ] **Table-by-table validation completed**: Each DynamoDB table has been individually reviewed with the user
- [ ] **User understands table consolidation**: User confirms understanding of which MySQL tables are combined and why
- [ ] **Denormalization decisions explained**: User understands all denormalization trade-offs and justifications
- [ ] **All tables individually approved**: User has confirmed understanding and approval of each table design
- [ ] `artifacts/stage-02/dynamodb_data_model.md` exists with comprehensive justifications from MCP analysis
- [ ] `artifacts/stage-02/migrationContract.json` exists and follows EXACT JSON structure specified in design
- [ ] Migration contract properly implements join patterns from contracts/migration_contract_patterns.md
- [ ] Contract generation followed standardized process from contracts/migration_contract_generation_guide.md
- [ ] Contract validates against schema defined in contracts/migration_contract_schema.json
- [ ] All MySQL entities are mapped to DynamoDB structures in the contract
- [ ] Unique constraint handling is properly implemented with lookup tables
- [ ] User has explicitly approved the complete design after table-by-table review
- [ ] User has explicitly validated the migration contract
- [ ] All design decisions are documented with trade-offs and rollback strategies

## User Confirmation Gates

This stage includes critical user confirmation points:

1. **Requirements Validation Gate**: After task 1.3
   - User must explicitly confirm all access patterns are captured
   - Do not proceed to MCP server analysis without clear user approval

2. **Table-by-Table Validation Gate**: During task 3.2
   - **CRITICAL**: User must validate EACH DynamoDB table individually
   - For each table, user must confirm understanding of:
     - Purpose and source MySQL table mapping
     - Partition key and sort key design decisions
     - GSI design and cost implications
     - Denormalization decisions and trade-offs
   - Do not proceed to next table until current table is approved
   - Do not proceed to overall design approval until all tables are individually validated

3. **Overall Design Validation Gate**: After task 3.3
   - User must approve the complete data model design after table-by-table review
   - Confirm overall design approach and trade-offs are acceptable

4. **Contract Validation Gate**: After task 4.2
   - User must validate migration contract format and completeness
   - Confirm all mappings are correct and complete

## MCP Server Requirements

The MCP server used for this stage should provide:

1. **DynamoDB Design Expertise**: Knowledge of best practices, patterns, and anti-patterns with comprehensive understanding of join pattern library from contracts/migration_contract_patterns.md
2. **Cost Analysis Capabilities**: Ability to calculate realistic RCU/WCU costs and identify optimization opportunities with consideration for join pattern performance implications
3. **Migration Contract Generation**: Ability to generate the exact JSON format required by subsequent stages using comprehensive join patterns and standardized generation process from contracts/migration_contract_generation_guide.md
4. **Join Pattern Integration**: Full support for all join pattern types (self-join, foreign-key, multi-column, conditional, chain, lookup-table, json-construction) with proper validation and optimization
5. **Trade-off Analysis**: Comprehensive analysis of design alternatives with clear justifications including join pattern selection rationale and performance implications
6. **Production Risk Assessment**: Identification of potential production issues with mitigation strategies including join pattern-specific risks (chain join complexity, JSON construction size limits, conditional join performance)
7. **Schema Transformation Expertise**: Understanding of complex relational data transformations including hierarchical data, many-to-many relationships, calculated fields, and time-based partitioning
8. **Validation Framework Integration**: Ability to validate generated contracts against comprehensive validation checklist including schema compliance, data integrity, performance optimization, and access pattern coverage
9. **Unique Constraint Handling**: Proper implementation of lookup table patterns for MySQL unique constraints using standardized patterns from the comprehensive pattern library

## Troubleshooting Guide

**MCP Server Issues:**
- **File Generation Problems**: If MCP server doesn't create the file in the correct location, explicitly specify the full path `artifacts/stage-02/dynamodb_data_model.md`
- **Incomplete File Generation**: If only partial content is generated, request MCP server to complete all missing sections
- **Multiple File Confusion**: Only request ONE file (`dynamodb_data_model.md`) - do not ask for `dynamodb_requirement.md`
- **API Patterns Missing**: If MCP server ignores API patterns and only focuses on table structure, emphasize: "The API patterns are the PRIMARY requirements that define what must be supported. Please ensure ALL API patterns are addressed in your design."
- **Table Structure Dominance**: If MCP server focuses too heavily on table structure, clarify: "Use table structure as the source data model, but design should be driven by API access patterns."
- **Join Pattern Issues**: If MCP server doesn't properly implement join patterns, provide specific pattern examples from contracts/migration_contract_patterns.md and emphasize the need for comprehensive relational data transformation support
- **Contract Format Problems**: If migration contract doesn't follow the standardized format, reference contracts/migration_contract_generation_guide.md and provide specific examples of required join pattern structures
- **Validation Failures**: If generated contract fails validation, use the comprehensive validation checklist to identify specific issues and request corrections with pattern-specific guidance
- If MCP server provides incomplete analysis, request specific missing elements with reference to the comprehensive pattern library
- If design recommendations don't address all access patterns, provide additional context including join pattern requirements
- If cost estimates seem unrealistic, request detailed breakdown and justification including join pattern performance implications
- If migration contract format is incorrect, provide exact format specification with join pattern examples from the standardized patterns

**Requirements Gathering Issues:**
- **RPS Missing**: If user hasn't provided RPS estimates, do NOT create any files until all RPS data is collected
- **Incomplete Patterns**: Always ask user about missing CRUD operations before creating any documentation
- If user is unsure about RPS estimates, help estimate based on business context and stage-01 performance analysis
- If access patterns seem incomplete, ask specific questions about missing operations
- If requirements keep changing, document evolution and get explicit confirmation of final state

**Requirements Gathering Issues:**
- If user is unsure about RPS estimates, help estimate based on business context and stage-01 performance analysis
- If access patterns seem incomplete, ask specific questions about missing CRUD operations
- If requirements keep changing, document evolution and get explicit confirmation of final state

**Design Validation Issues:**
- If MCP server design doesn't follow specified principles, request redesign with explicit constraints
- If trade-offs are unclear, request detailed comparison of alternatives
- If production risks are not adequately addressed, request additional risk analysis