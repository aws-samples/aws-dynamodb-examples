# DynamoDB Data Modeling with MCP Server - Design

## Overview

The DynamoDB Data Modeling with MCP Server stage implements a streamlined approach to transform MySQL schema analysis into an optimized DynamoDB data model by leveraging specialized MCP tools. The design maintains the same quality output as the manual approach while significantly reducing complexity and time investment.

## Architecture

### MCP-Assisted Modeling Architecture

```mermaid
graph TD
    A[Stage-01 Modular Artifacts] --> B[Requirements Analysis]
    B --> C[MCP Context Preparation]
    C --> D[MCP Server Interaction]
    D --> E[Design Validation]
    E --> F[Migration Contract Generation]
    F --> G[User Validation Gates]
    
    subgraph "MCP Server Integration"
        H[DynamoDB Design MCP]
        I[Cost Analysis MCP]
        J[Migration Contract MCP]
    end
    
    subgraph "Output Files"
        K[dynamodb_data_model.md]
        L[migrationContract.json]
    end
    
    D --> H
    D --> I
    D --> J
    E --> K
    F --> L
```

## Components and Interfaces

### 1. Requirements Analysis and Context Preparation System
**Purpose**: Analyze stage-01 artifacts and prepare comprehensive context for MCP server interaction

**Context Preparation Process**:
```markdown
# MCP Context Document Template

## Application Overview
- **Domain**: [extracted from stage-01 artifacts]
- **Key Entities**: [from 01_3_entity_relationships.md]
- **Business Context**: [from API analysis and performance data]
- **Scale Requirements**: [from 01_5_performance_analysis.md]

## Access Patterns Summary
[Extracted from 01_1_API_access_patterns.md and 01_2_mysql_log_analysis.md]
| Pattern | Description | RPS (Peak/Avg) | Type | Entities | Requirements |
|---------|-------------|-----------------|------|----------|--------------|
| 1 | Get user by ID | [USER PROVIDED] | Read | User | <50ms latency |

## Entity Relationships
[From 01_3_table_structure_analysis.md]
- User → Orders: 1:Many (cardinality from analysis)
- Order → OrderItems: 1:Many (cardinality from analysis)

## Current MySQL Schema
[From 01_3_table_structure_analysis.md]
- Tables, columns, indexes, constraints
- Current performance characteristics
- Known bottlenecks and issues

## Performance Data
[From 01_2_mysql_log_analysis.md]
- Query frequency and patterns from log analysis
- Performance bottlenecks and slow queries
- RPS estimates based on actual usage

## Design Constraints and Preferences
- Let MCP server determine optimal approach based on access patterns and data model
- No predetermined design preferences to avoid biasing the analysis
```

### 2. MCP Server Integration System
**Purpose**: Leverage specialized MCP servers for DynamoDB design expertise

**MCP Server Interaction Pattern**:
```typescript
interface MCPDynamoDBDesignRequest {
    context: {
        application_domain: string;
        entities: EntityDefinition[];
        relationships: RelationshipDefinition[];
        access_patterns: AccessPattern[];
        performance_requirements: PerformanceRequirement[];
        mysql_schema: MySQLSchema;
    };
    design_preferences: {
        // Let MCP server determine optimal approach
        // No predetermined preferences to avoid bias
    };
    constraints: {
        rps_requirements: Record<string, number>;
        latency_requirements: Record<string, number>;
        consistency_requirements: Record<string, string>;
    };
}

interface MCPDynamoDBDesignResponse {
    data_model_document: string; // Complete dynamodb_data_model.md content
    recommended_design: {
        tables: TableDesign[];
        gsis: GSIDesign[];
        access_pattern_mapping: AccessPatternMapping[];
    };
    alternative_designs: AlternativeDesign[];
    cost_analysis: CostAnalysis;
    trade_offs: TradeOffAnalysis;
    warnings: ProductionWarning[];
}
```

**MCP Server Usage Workflow**:
1. **Design Request**: Send comprehensive context to MCP server
2. **Data Model Generation**: MCP server creates `dynamodb_data_model.md` with complete design documentation
3. **Design Analysis**: Receive multiple design options with trade-offs
4. **Cost Analysis**: Get detailed cost breakdown and optimization suggestions
5. **Risk Assessment**: Obtain hot partition and scaling risk analysis
6. **Contract Generation**: Generate migration contract with MCP assistance

### 3. Design Validation and Enhancement System
**Purpose**: Validate MCP server outputs and ensure completeness

**Validation Checklist**:
```python
class MCPOutputValidator:
    def validate_design_completeness(self, mcp_output, original_requirements):
        validations = {
            "all_access_patterns_addressed": self.check_access_pattern_coverage(mcp_output, original_requirements),
            "all_entities_mapped": self.check_entity_mapping(mcp_output, original_requirements),
            "design_principles_followed": self.check_design_principles(mcp_output),
            "cost_analysis_realistic": self.validate_cost_estimates(mcp_output),
            "production_warnings_appropriate": self.check_warnings(mcp_output)
        }
        return validations
    
    def enhance_mcp_output(self, mcp_output, validation_results):
        # Add missing elements or request clarification from MCP server
        enhancements = []
        if not validation_results["all_access_patterns_addressed"]:
            enhancements.append("REQUEST_MISSING_PATTERN_MAPPING")
        if not validation_results["cost_analysis_realistic"]:
            enhancements.append("REQUEST_DETAILED_COST_BREAKDOWN")
        return enhancements
```

### 4. Migration Contract Generation System
**Purpose**: Generate exact JSON format migration contract with MCP server assistance using comprehensive join patterns and standardized generation process

**Contract Generation Process with Pattern Integration**:
```typescript
interface ContractGenerationRequest {
    final_design: DynamoDBDesign;
    mysql_schema: MySQLSchema;
    access_patterns: AccessPattern[];
    contract_format: ContractJSONSchema; // Exact format specification
    join_patterns: JoinPatternLibrary; // Comprehensive pattern library
    generation_standards: GenerationGuideStandards; // Standardized process
}

class MigrationContractGenerator {
    private patternLibrary: JoinPatternLibrary;
    private generationGuide: GenerationGuideStandards;
    
    constructor() {
        this.patternLibrary = this.loadPatternLibrary(); // From contracts/migration_contract_patterns.md
        this.generationGuide = this.loadGenerationStandards(); // From contracts/migration_contract_generation_guide.md
    }
    
    async generateContract(request: ContractGenerationRequest): Promise<MigrationContract> {
        // Step 1: Analyze source schema using pattern-based approach
        const schemaAnalysis = await this.analyzeSourceSchema(request.mysql_schema);
        
        // Step 2: Map access patterns to join requirements
        const accessPatternMapping = await this.mapAccessPatterns(request.access_patterns, schemaAnalysis);
        
        // Step 3: Select appropriate join patterns for each relationship
        const joinPatternSelection = await this.selectJoinPatterns(schemaAnalysis.relationships);
        
        // Step 4: Design table structure with pattern integration
        const tableStructure = await this.designTableStructure(request.final_design, joinPatternSelection);
        
        // Step 5: Generate contract JSON with MCP server assistance
        const mcpResponse = await this.mcpServer.generateMigrationContract({
            design: request.final_design,
            source_schema: request.mysql_schema,
            format_specification: request.contract_format,
            join_patterns: joinPatternSelection,
            pattern_library: this.patternLibrary,
            generation_standards: this.generationGuide,
            validation_rules: this.getValidationRules()
        });
        
        // Step 6: Validate generated contract using comprehensive checklist
        const validation = await this.validateContractComprehensive(mcpResponse.contract, request);
        if (!validation.isValid) {
            throw new Error(`Contract validation failed: ${validation.errors}`);
        }
        
        return mcpResponse.contract;
    }
    
    private async analyzeSourceSchema(schema: MySQLSchema): Promise<SchemaAnalysis> {
        return {
            tables: schema.tables,
            relationships: this.identifyRelationships(schema),
            hierarchical_data: this.findSelfReferencingTables(schema),
            many_to_many: this.findJunctionTables(schema),
            calculated_fields: this.identifyCalculatedFields(schema),
            time_based_data: this.findTimeBasedTables(schema)
        };
    }
    
    private async selectJoinPatterns(relationships: Relationship[]): Promise<JoinPatternSelection[]> {
        return relationships.map(rel => {
            switch (rel.type) {
                case 'self-referencing':
                    return { relationship: rel, pattern: this.patternLibrary.selfJoin };
                case 'foreign-key':
                    return { relationship: rel, pattern: this.patternLibrary.foreignKey };
                case 'composite-key':
                    return { relationship: rel, pattern: this.patternLibrary.multiColumn };
                case 'optional':
                    return { relationship: rel, pattern: this.patternLibrary.conditional };
                case 'multi-hop':
                    return { relationship: rel, pattern: this.patternLibrary.chain };
                case 'many-to-many':
                    return { relationship: rel, pattern: this.patternLibrary.lookupTable };
                case 'aggregated':
                    return { relationship: rel, pattern: this.patternLibrary.jsonConstruction };
                default:
                    throw new Error(`Unknown relationship type: ${rel.type}`);
            }
        });
    }
    
    private async validateContractComprehensive(contract: any, request: ContractGenerationRequest): Promise<ValidationResult> {
        const validations = {
            // Schema compliance validation
            schema_compliance: this.validateSchemaCompliance(contract),
            
            // Data integrity validation
            data_integrity: this.validateDataIntegrity(contract, request.mysql_schema),
            
            // Performance optimization validation
            performance_optimization: this.validatePerformanceOptimization(contract),
            
            // Access pattern coverage validation
            access_pattern_coverage: this.validateAccessPatternCoverage(contract, request.access_patterns),
            
            // Join pattern validation
            join_pattern_validation: this.validateJoinPatterns(contract),
            
            // Transformation logic validation
            transformation_validation: this.validateTransformationLogic(contract)
        };
        
        return {
            isValid: Object.values(validations).every(v => v.isValid),
            errors: Object.values(validations).flatMap(v => v.errors || []),
            validations: validations
        };
    }
    
    private validateJoinPatterns(contract: any): ValidationResult {
        const errors: string[] = [];
        
        for (const table of contract.tables) {
            for (const attribute of table.attributes) {
                if (attribute.join) {
                    // Validate join pattern structure
                    const pattern = this.patternLibrary.getPattern(attribute.join.type);
                    if (!pattern) {
                        errors.push(`Unknown join pattern: ${attribute.join.type}`);
                        continue;
                    }
                    
                    // Validate required fields for pattern
                    const requiredFields = pattern.getRequiredFields();
                    for (const field of requiredFields) {
                        if (!attribute.join[field]) {
                            errors.push(`Missing required field ${field} for ${attribute.join.type} pattern`);
                        }
                    }
                    
                    // Validate chain pattern specific fields
                    if (attribute.join.type === 'chain') {
                        if (attribute.join.chain_separator !== undefined && typeof attribute.join.chain_separator !== 'string') {
                            errors.push(`chain_separator must be a string for chain join pattern`);
                        }
                        if (!attribute.join.joins || !Array.isArray(attribute.join.joins)) {
                            errors.push(`joins array is required for chain join pattern`);
                        }
                    }
                    
                    // Validate pattern-specific logic
                    const patternValidation = pattern.validate(attribute.join);
                    if (!patternValidation.isValid) {
                        errors.push(...patternValidation.errors);
                    }
                }
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
}

// Join Pattern Library Integration
interface JoinPatternLibrary {
    selfJoin: SelfJoinPattern;
    foreignKey: ForeignKeyPattern;
    multiColumn: MultiColumnPattern;
    conditional: ConditionalPattern;
    chain: ChainPattern;
    lookupTable: LookupTablePattern;
    jsonConstruction: JsonConstructionPattern;
    
    getPattern(type: string): JoinPattern | null;
}

interface JoinPattern {
    type: string;
    description: string;
    useCase: string;
    getRequiredFields(): string[];
    validate(joinSpec: any): ValidationResult;
    generateExample(context: any): any;
}

// Generation Standards Integration
interface GenerationGuideStandards {
    coreSchema: CoreSchemaStructure;
    patternImplementation: PatternImplementationGuide;
    validationChecklist: ValidationChecklistStandards;
    performanceOptimization: PerformanceOptimizationStandards;
    testingStrategy: TestingStrategyStandards;
}
```

### 5. User Validation and Confirmation System
**Purpose**: Ensure user approval at critical decision points with comprehensive table-by-table validation

**Validation Gates**:
1. **Requirements Confirmation**: User confirms all access patterns and RPS estimates
2. **Table-by-Table Validation**: User validates each DynamoDB table design individually
3. **Overall Design Approval**: User approves complete design after table-by-table review
4. **Contract Validation**: User validates migration contract completeness

**Table-by-Table Validation Process**:
```typescript
interface TableValidationContext {
    table_name: string;
    purpose: string;
    source_mysql_tables: string[];
    partition_key: {
        attribute: string;
        justification: string;
        distribution_strategy: string;
    };
    sort_key?: {
        attribute: string;
        justification: string;
        query_patterns_enabled: string[];
    };
    gsis: GSIValidationContext[];
    access_patterns_served: string[];
    denormalization_decisions: DenormalizationDecision[];
    cost_implications: CostBreakdown;
}

class TableByTableValidator {
    async validateEachTable(design: DynamoDBDesign): Promise<ValidationResult[]> {
        const results: ValidationResult[] = [];
        
        for (const table of design.tables) {
            const context = this.prepareTableContext(table);
            const validation = await this.validateSingleTable(context);
            results.push(validation);
            
            // Don't proceed to next table until current table is approved
            if (!validation.approved) {
                throw new Error(`Table ${table.name} validation failed. Address concerns before proceeding.`);
            }
        }
        
        return results;
    }
    
    private async validateSingleTable(context: TableValidationContext): Promise<ValidationResult> {
        const validation = await this.userInput({
            question: `Let's review the ${context.table_name} table design:

**Purpose**: ${context.purpose}

**Source MySQL Tables**: ${context.source_mysql_tables.join(', ')}

**Partition Key**: ${context.partition_key.attribute}
- **Why**: ${context.partition_key.justification}
- **Distribution**: ${context.partition_key.distribution_strategy}

**Sort Key**: ${context.sort_key?.attribute || 'None'}
${context.sort_key ? `- **Why**: ${context.sort_key.justification}
- **Enables**: ${context.sort_key.query_patterns_enabled.join(', ')}` : ''}

**GSIs**: ${context.gsis.length > 0 ? context.gsis.map(gsi => gsi.name).join(', ') : 'None'}

**Access Patterns Served**: ${context.access_patterns_served.join(', ')}

${context.denormalization_decisions.length > 0 ? `**Denormalization**: We're combining data from multiple MySQL tables because:
${context.denormalization_decisions.map(d => `- ${d.justification}`).join('\n')}` : ''}

**Monthly Cost Estimate**: $${context.cost_implications.monthly_cost}

Does this table design make sense? Do you understand why we're structuring it this way?`,
            context: context,
            reason: "spec-design-review"
        });
        
        return {
            table_name: context.table_name,
            approved: validation.approved,
            user_feedback: validation.feedback,
            concerns: validation.concerns || []
        };
    }
}

interface ValidationResult {
    table_name: string;
    approved: boolean;
    user_feedback: string;
    concerns: string[];
}
```

**User Interaction Pattern**:
```typescript
class UserValidationGates {
    async requirementsConfirmation(requirements: Requirements): Promise<boolean> {
        const confirmation = await this.userInput({
            question: "Do these access patterns and RPS estimates look complete and accurate?",
            context: requirements,
            reason: "spec-requirements-review"
        });
        return confirmation.approved;
    }
    
    async tableByTableValidation(design: DynamoDBDesign): Promise<TableValidationResult[]> {
        const validator = new TableByTableValidator();
        return await validator.validateEachTable(design);
    }
    
    async overallDesignApproval(design: DynamoDBDesign, validationResults: TableValidationResult[]): Promise<boolean> {
        const approval = await this.userInput({
            question: "After reviewing each table individually, does the complete design approach look good?",
            context: { 
                design, 
                table_validations: validationResults,
                summary: this.createDesignSummary(design, validationResults)
            },
            reason: "spec-design-review"
        });
        return approval.approved;
    }
    
    async contractValidation(contract: MigrationContract): Promise<boolean> {
        const validation = await this.userInput({
            question: "Does this migration contract look complete and accurate?",
            context: contract,
            reason: "spec-tasks-review"
        });
        return validation.approved;
    }
    
    private createDesignSummary(design: DynamoDBDesign, validations: TableValidationResult[]): DesignSummary {
        return {
            total_tables: design.tables.length,
            total_gsis: design.tables.reduce((sum, table) => sum + table.gsis.length, 0),
            mysql_tables_consolidated: this.countMySQLTablesConsolidated(design),
            estimated_monthly_cost: design.cost_analysis.total_monthly_cost,
            user_concerns: validations.flatMap(v => v.concerns),
            all_tables_approved: validations.every(v => v.approved)
        };
    }
}
```

## Migration Contract Pattern Integration

### Comprehensive Join Pattern Support

The migration contract generation system integrates a comprehensive library of join patterns to handle all relational data transformation scenarios:

#### Pattern Categories and Use Cases

1. **Self-Join Pattern**: Hierarchical data (categories, organizational charts)
   ```json
   {
     "join": {
       "type": "self-join",
       "join_alias": "parent_cat",
       "join_condition": "parent_cat.id = categories.parent_id",
       "select_column": "parent_cat.name",
       "null_value": "ROOT"
     }
   }
   ```

2. **Foreign Key Pattern**: Simple lookups (product→category, order→user)
   ```json
   {
     "join": {
       "type": "foreign-key",
       "target_table": "categories",
       "join_condition": "categories.id = products.category_id",
       "select_column": "categories.name"
     }
   }
   ```

3. **Multi-Column Pattern**: Composite foreign keys, complex relationships
   ```json
   {
     "join": {
       "type": "multi-column",
       "target_table": "product_variants",
       "join_conditions": [
         "product_variants.product_id = order_items.product_id",
         "product_variants.variant_id = order_items.variant_id"
       ],
       "select_column": "CONCAT(product_variants.name, ' - ', product_variants.variant_name)"
     }
   }
   ```

4. **Conditional Pattern**: Optional relationships, polymorphic associations
   ```json
   {
     "join": {
       "type": "conditional",
       "condition": "reviews.user_id IS NOT NULL",
       "target_table": "users",
       "join_condition": "users.id = reviews.user_id",
       "select_column": "users.username",
       "else_value": "Anonymous"
     }
   }
   ```

5. **Chain Pattern**: Multi-hop relationships (user→order→product)
   ```json
   {
     "join": {
       "type": "chain",
       "joins": [
         {
           "target_table": "orders",
           "join_condition": "orders.id = order_items.order_id",
           "select_column": "orders.user_id"
         },
         {
           "target_table": "users",
           "join_condition": "users.id = orders.user_id",
           "select_column": "users.username"
         }
       ]
     }
   }
   ```

   **Chain Pattern with Separator**: For concatenated results from chain joins
   ```json
   {
     "join": {
       "type": "chain",
       "chain_separator": " > ",
       "joins": [
         {
           "target_table": "products",
           "join_condition": "products.id = order_items.product_id",
           "select_column": "products.name"
         },
         {
           "target_table": "categories",
           "join_condition": "categories.id = products.category_id",
           "select_column": "categories.name"
         }
       ]
     }
   }
   ```

6. **Lookup Table Pattern**: Many-to-many relationships (product tags, user roles)
   ```json
   {
     "join": {
       "type": "lookup-table",
       "target_table": "tags",
       "join_condition": "tags.id = product_tags.tag_id",
       "select_column": "tags.name"
     }
   }
   ```

7. **JSON Construction Pattern**: Aggregated data (denormalizing related records)
   ```json
   {
     "join": {
       "type": "json-construction",
       "target_table": "reviews",
       "join_condition": "reviews.product_id = products.id",
       "construction": {
         "type": "array",
         "limit": 5,
         "order_by": "reviews.created_at DESC",
         "select_columns": {
           "rating": "reviews.rating",
           "comment": "reviews.comment",
           "reviewer": "reviews.username",
           "date": "reviews.created_at"
         }
       }
     }
   }
   ```

#### Pattern Selection Algorithm

```typescript
class PatternSelector {
    selectPattern(relationship: Relationship): JoinPattern {
        // Analyze relationship characteristics
        const analysis = this.analyzeRelationship(relationship);
        
        // Apply pattern selection logic
        if (analysis.isSelfReferencing) {
            return this.patternLibrary.selfJoin;
        } else if (analysis.isOptional) {
            return this.patternLibrary.conditional;
        } else if (analysis.isComposite) {
            return this.patternLibrary.multiColumn;
        } else if (analysis.isMultiHop) {
            return this.patternLibrary.chain;
        } else if (analysis.isManyToMany) {
            return this.patternLibrary.lookupTable;
        } else if (analysis.requiresAggregation) {
            return this.patternLibrary.jsonConstruction;
        } else {
            return this.patternLibrary.foreignKey;
        }
    }
}
```

### Generation Process Integration

The migration contract generation follows a standardized 5-step process:

1. **Source Schema Analysis**: Identify all tables, relationships, and transformation requirements
2. **Access Pattern Mapping**: Map access patterns to join requirements and denormalization needs
3. **Join Pattern Selection**: Choose appropriate patterns for each relationship type
4. **Table Structure Design**: Design DynamoDB tables with pattern integration
5. **Contract JSON Generation**: Generate final contract with comprehensive validation

### Validation Framework

```typescript
interface ComprehensiveValidation {
    schema_compliance: {
        json_structure: boolean;
        required_fields: boolean;
        type_safety: boolean;
    };
    data_integrity: {
        null_handling: boolean;
        join_completeness: boolean;
        transformation_logic: boolean;
    };
    performance_optimization: {
        partition_distribution: boolean;
        gsi_efficiency: boolean;
        item_size_limits: boolean;
    };
    access_pattern_coverage: {
        all_patterns_satisfied: boolean;
        query_efficiency: boolean;
        cost_optimization: boolean;
    };
}
```

## Data Models

### MCP Context Structure
```typescript
interface MCPContext {
    application: {
        domain: string;
        scale: ScaleRequirements;
        constraints: BusinessConstraints;
    };
    entities: EntityDefinition[];
    relationships: RelationshipDefinition[];
    access_patterns: AccessPattern[];
    mysql_schema: MySQLSchema;
    performance_data: PerformanceMetrics;
}

interface AccessPattern {
    id: string;
    description: string;
    rps_peak: number;
    rps_average: number;
    operation_type: "READ" | "WRITE" | "UPDATE" | "DELETE";
    entities_involved: string[];
    consistency_requirement: "EVENTUAL" | "STRONG";
    latency_requirement: number; // milliseconds
}
```

### MCP Design Response Structure
```typescript
interface MCPDesignResponse {
    recommended_design: {
        approach: string;
        rationale: string;
        tables: TableDesign[];
        gsis: GSIDesign[];
        cost_estimate: CostBreakdown;
    };
    alternatives: AlternativeDesign[];
    trade_offs: {
        performance_vs_cost: TradeOffAnalysis;
        complexity_vs_flexibility: TradeOffAnalysis;
        consistency_vs_availability: TradeOffAnalysis;
    };
    warnings: ProductionWarning[];
    migration_considerations: MigrationConsideration[];
}
```

## Error Handling

### MCP Server Communication Errors
- **Connection Failures**: Retry with exponential backoff
- **Invalid Responses**: Request clarification or regeneration
- **Incomplete Outputs**: Identify missing elements and request completion

### Validation Failures
- **Design Gaps**: Request additional analysis from MCP server
- **Contract Errors**: Regenerate with corrected specifications
- **User Rejection**: Iterate with user feedback and MCP server

## Critical Production Warnings

The MCP server should surface these warnings when relevant:

1. **GSI Throttling Cascade**: "Warning: GSI throttling will affect the entire base table"
2. **Hot Partition Risk**: "Warning: This access pattern may create hot partitions"
3. **Entity Boundary Violation**: "Warning: Mixing data from different services/teams"
4. **Schema Evolution Trap**: "Warning: This denormalization will complicate future schema changes"
5. **Debugging Complexity**: "Warning: Composite keys and denormalized data will increase debugging difficulty"

## MCP Server Requirements

The MCP server used for this stage should provide:

1. **DynamoDB Design Expertise**: Knowledge of best practices, patterns, and anti-patterns with comprehensive understanding of join pattern library
2. **Cost Analysis Capabilities**: Ability to calculate RCU/WCU costs and optimizations with consideration for join pattern performance implications
3. **Migration Contract Generation**: Ability to generate exact JSON format required using comprehensive join patterns and standardized generation process
4. **Join Pattern Integration**: Full support for all join pattern types (self-join, foreign-key, multi-column, conditional, chain, lookup-table, json-construction) with proper validation and optimization
5. **Trade-off Analysis**: Comprehensive analysis of design alternatives including join pattern selection rationale and performance implications
6. **Production Risk Assessment**: Identification of potential production issues including join pattern-specific risks (chain join complexity, JSON construction size limits, conditional join performance)
7. **Schema Transformation Expertise**: Understanding of complex relational data transformations including hierarchical data, many-to-many relationships, calculated fields, and time-based partitioning
8. **Validation Framework Integration**: Ability to validate generated contracts against comprehensive validation checklist including schema compliance, data integrity, performance optimization, and access pattern coverage
9. **Pattern Documentation Generation**: Capability to generate comprehensive migration contract schema documentation with field-by-field specifications and join pattern examples

## Testing Strategy

### MCP Server Output Validation
- Validate that all access patterns are addressed in the design
- Ensure cost estimates are realistic and well-justified
- Verify migration contract follows exact JSON structure
- Confirm all MySQL entities are properly mapped

### Design Quality Assurance
- Check that DynamoDB best practices are followed
- Validate that hot partition risks are identified and mitigated
- Ensure denormalization decisions are well-justified
- Confirm that unique constraint handling is properly implemented