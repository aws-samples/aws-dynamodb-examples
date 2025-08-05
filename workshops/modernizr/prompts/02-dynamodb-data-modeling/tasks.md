# DynamoDB Data Modeling - Tasks

- [ ] 1. Gather and document access pattern requirements systematically
  - [ ] 1.1 Initialize requirements documentation system
    - Make sure you have a clean commit log. 
    - Create `dynamodb_requirement.md` as working scratchpad file
    - Set up template structure with Application Overview, Access Patterns Analysis, Entity Relationships, and Design Considerations sections
    - Read and analyze the modular artifacts from stage-01 (`artifacts/stage-01/01_1_API_access_patterns.md`, `artifacts/stage-01/01_2_schema_extraction.md`, `artifacts/stage-01/01_3_entity_relationships.md`, `artifacts/stage-01/01_4_table_structures.md`, `artifacts/stage-01/01_5_performance_analysis.md`, `artifacts/stage-01/01_6_access_patterns.md`) to understand current database structure
    - Extract initial access patterns and entities from the stage-01 modular artifacts, particularly the API access patterns and performance analysis
    - _Requirements: 1.1_

  - [ ] 1.2 Document all access patterns with RPS estimates
    - **CRITICAL**: For EVERY access pattern, require RPS estimates and never fabricate numbers
    - Create comprehensive access patterns analysis table with Pattern #, Description, RPS (Peak/Average), Type, Attributes, Key Requirements, Design Considerations, and Status
    - Work with user to estimate RPS based on business context if not available from performance analysis
    - Ensure both read and write patterns are documented for every entity
    - Update `dynamodb_requirement.md` after EVERY user message with new information
    - _Requirements: 1.2, 1.3_

  - [ ] 1.3 Validate requirements completeness with user
    - Review all documented access patterns for completeness
    - Confirm that every read pattern has a corresponding write pattern (and vice versa) unless user explicitly declines
    - Ask user: "Do you have any other access patterns to discuss? I see we have a user login access pattern but no pattern to create users. Should we add one?"
    - **USER CONFIRMATION GATE**: Do not proceed until user explicitly confirms all patterns are captured
    - Mark requirements validation as complete only after user approval
    - _Requirements: 1.4, 1.5_

- [ ] 2. Apply DynamoDB design principles and evaluate alternatives
  - [ ] 2.1 Apply core design philosophy
    - **Multi-Table First**: Start with separate tables per entity, not single-table optimization
    - **Natural Keys**: Use descriptive keys (user_id, order_id) not generic ones (PK, SK)
    - **Access Pattern Driven**: Design each table from query patterns, not entity structure
    - Document design approach and rationale in requirements file
    - _Requirements: 2.1, 2.2, 2.3_

  - [ ] 2.2 Evaluate denormalization decisions using framework
    - Apply denormalization decision framework with production risk assessment
    - Evaluate factors: item size trajectory, access pattern coupling, write amplification, consistency requirements
    - Consider operational complexity, schema evolution risk, and hot partition risk
    - For each potential denormalization, document: alternatives considered, trade-offs, rollback strategy
    - **Evidence Before Optimization**: Only denormalize after demonstrating genuine need
    - _Requirements: 2.4, 3.1, 3.2_

  - [ ] 2.3 Analyze cost implications and hot partition risks
    - Evaluate total cost of ownership including development velocity and operational overhead
    - Perform hot partition vulnerability analysis for each table design
    - Calculate write amplification factors for GSI designs
    - Consider identifying relationships to eliminate GSIs and reduce costs by 50%
    - Document explicit trade-offs with rollback strategies for each design decision
    - _Requirements: 2.5, 3.3, 3.4, 3.5_

- [ ] 3. Generate final data model with comprehensive justifications
  - [ ] 3.1 Create final data model document
    - Create `dynamodb_data_model.md` as final deliverable (not a copy of design considerations)
    - **Step-by-Step Reasoning**: Re-evaluate everything in final model, don't copy design considerations verbatim
    - Include Design Philosophy & Approach section explaining overall approach and key principles applied
    - Document each table design with purpose, partition key, sort key, and detailed justifications
    - _Requirements: 4.1_

  - [ ] 3.2 Design tables and GSIs with complete specifications
    - For each table: document purpose, partition key with distribution reasoning, sort key with query pattern justification
    - For each GSI: document purpose, partition key with cardinality justification, projection type with cost vs performance analysis
    - Include sparse GSI specifications where appropriate with field specifications and justifications
    - Map all access patterns to specific table operations with implementation notes
    - _Requirements: 4.2_

  - [ ] 3.3 Provide cost estimates and performance analysis
    - Calculate monthly RCU/WCU costs using AVERAGE RPS (not peak RPS) for realistic estimates
    - Include cost breakdown by table and GSI with detailed calculations
    - Perform hot partition analysis with mitigation strategies
    - Document trade-offs and optimizations with explicit justifications
    - _Requirements: 3.1, 3.2, 3.3_

- [ ] 4. Generate migration contract in exact required format
  - [ ] 4.1 Create migration contract following exact JSON structure
    - **CRITICAL**: Generate `migrationContract.json` following the EXACT JSON structure specified in design document
    - Each table entry MUST include: table, type, source_table, pk, sk (optional), gsis (optional), attributes, satisfies, estimated_item_size_bytes
    - For each attribute: include type (S/N/B), source_table, source_column mappings
    - For denormalized attributes: MUST include denormalized=true, justification, and join object with local_column and source_column
    - _Requirements: 4.1, 4.2, 4.3_

  - [ ] 4.2 Implement unique constraint handling patterns
    - For each unique constraint from MySQL, create dedicated lookup table pattern
    - Include TransactWriteItems patterns with ConditionExpression for uniqueness enforcement
    - Document the ddb_query_plan structure for atomic operations
    - Ensure all unique constraints are properly mapped and enforceable in DynamoDB
    - _Requirements: 4.4_

  - [ ] 4.3 Validate migration contract completeness
    - Verify that all access patterns from requirements are satisfied by designed tables and GSIs
    - Confirm all MySQL entities are properly mapped to DynamoDB structures
    - Validate JSON structure follows exact format requirements
    - Ensure all required fields are present and properly formatted
    - **USER CONFIRMATION GATE**: Get user approval of migration contract before proceeding
    - _Requirements: 4.5_

- [ ] 5. Surface critical production warnings and finalize documentation
  - [ ] 5.1 Surface critical production warnings
    - **GSI Throttling Cascade**: Warn when GSI throttling will affect entire base table
    - **Hot Partition Risk**: Warn when access patterns may create hot partitions with mitigation strategies
    - **Entity Boundary Violation**: Warn when mixing data from different services/teams
    - **Schema Evolution Trap**: Warn when denormalization will complicate future schema changes
    - **Debugging Complexity**: Warn when composite keys and denormalized data will increase debugging difficulty
    - _Requirements: 3.4, 3.5_

  - [ ] 5.2 Finalize all documentation and validate outputs
    - Review `dynamodb_requirement.md` for completeness and accuracy
    - Validate `dynamodb_data_model.md` includes all required sections with proper justifications
    - Confirm `migrationContract.json` follows exact structure and includes all mappings
    - Ensure all design decisions are documented with trade-offs and rollback strategies
    - Verify that outputs provide sufficient information for subsequent stages
    - _Requirements: 4.5_

## Output Validation Checklist

Before marking this stage complete, verify:
- [ ] `dynamodb_requirement.md` exists with complete access pattern analysis
- [ ] All access patterns have RPS estimates (no fabricated numbers)
- [ ] User has explicitly confirmed all access patterns are captured
- [ ] `dynamodb_data_model.md` exists with step-by-step reasoning and complete justifications
- [ ] `migrationContract.json` exists and follows EXACT JSON structure specified in design
- [ ] All MySQL entities are mapped to DynamoDB structures in the contract
- [ ] Unique constraint handling is properly implemented
- [ ] Critical production warnings have been surfaced where relevant
- [ ] All design decisions are documented with trade-offs and rollback strategies

## User Confirmation Gates

This stage includes critical user confirmation points:

1. **Requirements Validation Gate**: After task 1.3
   - User must explicitly confirm all access patterns are captured
   - Do not proceed to design phase without clear user approval

2. **Design Validation Gate**: After task 3.3
   - User must approve the final data model design
   - Confirm design approach and trade-offs are acceptable

3. **Contract Validation Gate**: After task 4.3
   - User must validate migration contract format and completeness
   - Confirm all mappings are correct and complete

## Troubleshooting Guide

**Requirements Gathering Issues:**
- If user is unsure about RPS estimates, help estimate based on business context
- If access patterns seem incomplete, ask specific questions about missing CRUD operations
- If requirements keep changing, document evolution and get explicit confirmation of final state

**Design Complexity Issues:**
- If design becomes too complex, suggest breaking down into smaller components
- If denormalization decisions are unclear, apply the decision framework systematically
- If hot partition risks are high, document mitigation strategies clearly

**Migration Contract Issues:**
- If JSON structure is incorrect, refer back to exact format in design document
- If mappings are incomplete, cross-reference with stage-01 modular artifacts and requirements
- If unique constraints are complex, implement lookup table patterns as specified