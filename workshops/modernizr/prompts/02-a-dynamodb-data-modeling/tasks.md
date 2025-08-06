# DynamoDB Data Modeling with MCP Server - Tasks

## COMMIT FREQUENCY AND TASK COMPLETION

**IMPORTANT**: 
- **Commit changes frequently** throughout this stage to maintain a clean Git history
- **Use `git -P`** to avoid interactive prompts
- **Mark tasks as completed** by changing `[ ]` to `[x]` as you finish each task
- **Commit after each major task completion** with descriptive messages
- **Update the tasks.md file** itself when marking tasks complete and commit those changes too

- [ ] 1. Analyze stage-01 artifacts and prepare comprehensive context
  - [ ] 1.1 Extract and analyze existing artifacts
    - Make sure you have a clean commit log
    - Read and analyze all stage-01 modular artifacts (`artifacts/stage-01/01_1_API_access_patterns.md`, `artifacts/stage-01/01_2_schema_extraction.md`, `artifacts/stage-01/01_3_entity_relationships.md`, `artifacts/stage-01/01_4_table_structures.md`, `artifacts/stage-01/01_5_performance_analysis.md`, `artifacts/stage-01/01_6_access_patterns.md`)
    - Extract key entities, relationships, and initial access patterns from the artifacts
    - Identify current MySQL schema structure, constraints, and performance characteristics
    - Document any existing bottlenecks or performance issues from the analysis
    - **COMMIT**: Commit artifact analysis with message "Analyze stage-01 artifacts for DynamoDB modeling context"
    - **MARK COMPLETE**: Update this task to [x] and commit the tasks.md change
    - _Requirements: 1.1_

  - [ ] 1.2 Gather complete access pattern requirements with RPS estimates
    - **CRITICAL**: For EVERY access pattern, require RPS estimates and never fabricate numbers
    - Create comprehensive access patterns analysis table with Pattern #, Description, RPS (Peak/Average), Type, Attributes, Key Requirements, and Design Considerations
    - Work with user to estimate RPS based on business context if not available from performance analysis
    - Ensure both read and write patterns are documented for every entity
    - Ask user specific questions about missing patterns: "I see we have a user login access pattern but no pattern to create users. Should we add one?"
    - **COMMIT**: Commit access pattern requirements with message "Document complete access patterns with RPS estimates"
    - **MARK COMPLETE**: Update this task to [x] and commit the tasks.md change
    - _Requirements: 1.2, 1.3_

  - [ ] 1.3 Prepare comprehensive MCP context document
    - Create detailed context document with Application Overview, Entity Relationships, Access Patterns, MySQL Schema, and Design Constraints
    - Include all information needed for MCP server to make informed design decisions
    - Specify design preferences: multi-table first approach, natural keys, access pattern driven design
    - Document performance requirements, consistency needs, and cost optimization priorities
    - **USER CONFIRMATION GATE**: Ask user "Do these access patterns and requirements look complete? Are there any other patterns we should consider?"
    - Do not proceed until user explicitly confirms all patterns are captured
    - **COMMIT**: Commit MCP context preparation with message "Prepare comprehensive context for MCP server analysis"
    - **MARK COMPLETE**: Update this task to [x] and commit the tasks.md change
    - _Requirements: 1.4, 1.5_

- [ ] 2. Leverage MCP server for DynamoDB design analysis
  - [ ] 2.1 Request initial design recommendations from MCP server
    - Use MCP server to analyze the prepared context and generate initial DynamoDB design recommendations
    - Request multiple design alternatives with trade-off analysis
    - Ensure MCP server provides comprehensive justifications for each design decision
    - Request specific analysis of denormalization opportunities and risks
    - **CRITICAL**: Ensure MCP server addresses all documented access patterns in the design
    - **COMMIT**: Commit initial MCP design analysis with message "Obtain initial DynamoDB design recommendations from MCP server"
    - **MARK COMPLETE**: Update this task to [x] and commit the tasks.md change
    - _Requirements: 2.1, 2.2_

  - [ ] 2.2 Request detailed cost analysis and optimization recommendations
    - Use MCP server to perform comprehensive cost analysis of recommended designs
    - Request RCU/WCU estimates based on average RPS (not peak RPS) for realistic cost projections
    - Obtain analysis of hot partition risks and mitigation strategies
    - Request write amplification analysis for GSI designs
    - Get recommendations for cost optimization opportunities (KEYS_ONLY projections, sparse GSIs, etc.)
    - **COMMIT**: Commit cost analysis with message "Obtain detailed cost analysis and optimization recommendations"
    - **MARK COMPLETE**: Update this task to [x] and commit the tasks.md change
    - _Requirements: 2.3, 2.4_

  - [ ] 2.3 Request production risk assessment and warnings
    - Use MCP server to identify potential production risks and issues
    - Request analysis of GSI throttling cascade risks
    - Obtain hot partition vulnerability assessment with specific mitigation strategies
    - Get warnings about entity boundary violations and operational complexity
    - Request schema evolution risk analysis for denormalized designs
    - Ensure debugging complexity warnings are provided where relevant
    - **COMMIT**: Commit production risk assessment with message "Obtain comprehensive production risk analysis"
    - **MARK COMPLETE**: Update this task to [x] and commit the tasks.md change
    - _Requirements: 2.5, 3.1_

- [ ] 3. Validate and finalize design with user approval
  - [ ] 3.1 Validate MCP server outputs for completeness
    - Verify that all original access patterns are addressed in the recommended design
    - Confirm that all MySQL entities are properly mapped to DynamoDB structures
    - Validate that cost estimates are realistic and well-justified
    - Check that production warnings are appropriate and comprehensive
    - Ensure that design follows specified principles (multi-table, natural keys, access pattern driven)
    - **COMMIT**: Commit design validation with message "Validate MCP server design outputs for completeness"
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
    - **COMMIT**: Commit table-by-table validation with message "Complete table-by-table design validation with user"
    - **MARK COMPLETE**: Update this task to [x] and commit the tasks.md change
    - _Requirements: 3.4, 3.5_

  - [ ] 3.3 Create final data model document
    - Create `dynamodb_data_model.md` incorporating MCP server analysis and user validation feedback
    - Include Design Philosophy & Approach section explaining overall approach and key principles
    - Document each table design with purpose, partition key, sort key, and detailed justifications from MCP analysis
    - Include user validation notes and any modifications made during table-by-table review
    - Include comprehensive cost estimates and performance analysis from MCP server
    - Document all trade-offs and design decisions with explicit justifications
    - **USER CONFIRMATION GATE**: Ask user "Does the complete design approach look good after our table-by-table review?"
    - Do not proceed until user explicitly approves the overall design approach
    - **COMMIT**: Commit final data model with message "Create final DynamoDB data model with user validation"
    - **MARK COMPLETE**: Update this task to [x] and commit the tasks.md change
    - _Requirements: 3.4, 3.5_

- [ ] 4. Generate migration contract with MCP server assistance
  - [ ] 4.1 Generate migration contract using MCP server
    - **CRITICAL**: Use MCP server to generate `migrationContract.json` following the EXACT JSON structure specified in design document
    - Each table entry MUST include: table, type, source_table, pk, sk (optional), gsis (optional), attributes, satisfies, estimated_item_size_bytes
    - For each attribute: include type (S/N/B), source_table, source_column mappings
    - For denormalized attributes: MUST include denormalized=true, justification, and join object with local_column and source_column
    - Ensure MCP server generates proper unique constraint handling patterns with lookup tables
    - **COMMIT**: Commit migration contract generation with message "Generate migration contract with MCP server assistance"
    - **MARK COMPLETE**: Update this task to [x] and commit the tasks.md change
    - _Requirements: 4.1, 4.2, 4.3_

  - [ ] 4.2 Validate migration contract completeness and accuracy
    - Verify that all access patterns from requirements are satisfied by designed tables and GSIs
    - Confirm all MySQL entities are properly mapped to DynamoDB structures
    - Validate JSON structure follows exact format requirements
    - Ensure all required fields are present and properly formatted
    - Check that unique constraint handling is properly implemented with TransactWriteItems patterns
    - **USER CONFIRMATION GATE**: Ask user "Does this migration contract look complete and accurate? Are all the mappings correct?"
    - Do not proceed until user explicitly validates the migration contract
    - **COMMIT**: Commit contract validation with message "Validate migration contract completeness and accuracy"
    - **MARK COMPLETE**: Update this task to [x] and commit the tasks.md change
    - _Requirements: 4.4, 4.5_

- [ ] 5. Finalize documentation and prepare for next stage
  - [ ] 5.1 Create comprehensive documentation summary
    - Document the MCP server interaction process and key decisions made
    - Summarize all design trade-offs and rationale for chosen approach
    - Document any deviations from MCP server recommendations and reasons
    - Create troubleshooting guide for common issues identified during analysis
    - Include recommendations for monitoring and operational considerations
    - **COMMIT**: Commit documentation summary with message "Create comprehensive documentation summary"
    - **MARK COMPLETE**: Update this task to [x] and commit the tasks.md change
    - _Requirements: 5.1_

  - [ ] 5.2 Validate readiness for next stage
    - Ensure `dynamodb_data_model.md` is complete with comprehensive justifications
    - Confirm `migrationContract.json` follows exact structure and includes all mappings
    - Verify that all design decisions are documented with trade-offs and rollback strategies
    - Validate that outputs provide sufficient information for stage 04 DynamoDB implementation
    - Confirm user has approved all major design decisions and migration contract
    - **COMMIT**: Commit final validation with message "Complete DynamoDB data modeling with MCP server assistance"
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
- [ ] `dynamodb_data_model.md` exists with comprehensive justifications from MCP analysis and user validation notes
- [ ] `migrationContract.json` exists and follows EXACT JSON structure specified in design
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

1. **DynamoDB Design Expertise**: Knowledge of best practices, patterns, and anti-patterns
2. **Cost Analysis Capabilities**: Ability to calculate realistic RCU/WCU costs and identify optimization opportunities
3. **Migration Contract Generation**: Ability to generate the exact JSON format required by subsequent stages
4. **Trade-off Analysis**: Comprehensive analysis of design alternatives with clear justifications
5. **Production Risk Assessment**: Identification of potential production issues with mitigation strategies
6. **Unique Constraint Handling**: Proper implementation of lookup table patterns for MySQL unique constraints

## Troubleshooting Guide

**MCP Server Issues:**
- If MCP server provides incomplete analysis, request specific missing elements
- If design recommendations don't address all access patterns, provide additional context
- If cost estimates seem unrealistic, request detailed breakdown and justification
- If migration contract format is incorrect, provide exact format specification

**Requirements Gathering Issues:**
- If user is unsure about RPS estimates, help estimate based on business context and stage-01 performance analysis
- If access patterns seem incomplete, ask specific questions about missing CRUD operations
- If requirements keep changing, document evolution and get explicit confirmation of final state

**Design Validation Issues:**
- If MCP server design doesn't follow specified principles, request redesign with explicit constraints
- If trade-offs are unclear, request detailed comparison of alternatives
- If production risks are not adequately addressed, request additional risk analysis