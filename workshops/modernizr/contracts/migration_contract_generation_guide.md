# Migration Contract Generation Guide

This guide provides comprehensive instructions for generating migration contracts that support all possible join scenarios and data transformation patterns when migrating from MySQL to DynamoDB.

## Overview

The migration contract is a JSON specification that defines how MySQL data should be transformed and loaded into DynamoDB tables. It must handle complex relational data patterns including joins, hierarchies, aggregations, and denormalization.

## Core Principles

### 1. Pattern-Based Approach
- Use predefined patterns from `migration_contract_patterns.md`
- Each pattern handles specific join/transformation scenarios
- Combine patterns for complex requirements

### 2. Schema Validation
- All contracts must validate against `migration_contract_schema.json`
- Required fields must be present for each pattern type
- Type safety is enforced for all attributes

### 3. Performance Optimization
- Consider read/write patterns when designing joins
- Minimize chain joins where possible
- Use appropriate GSIs for join result queries

## Generation Process

### Step 1: Analyze Source Schema
1. **Identify all tables** and their relationships
2. **Map foreign key constraints** to join patterns
3. **Identify hierarchical data** (self-referencing tables)
4. **Find many-to-many relationships** (junction tables)
5. **Locate calculated/derived fields** that need aggregation

### Step 2: Map Access Patterns
1. **Review all access patterns** from requirements
2. **Identify which patterns require joins** to satisfy
3. **Determine optimal denormalization strategy**
4. **Plan GSI requirements** for joined data queries

### Step 3: Select Join Patterns
For each relationship, choose the appropriate pattern:

| Relationship Type | Pattern | Use Case |
|------------------|---------|----------|
| Self-referencing FK | `self-join` | Categories, org charts |
| Simple FK | `foreign-key` | Product→Category |
| Composite FK | `multi-column` | Complex relationships |
| Optional FK | `conditional` | Nullable relationships |
| Multi-hop FK | `chain` | User→Order→Product |
| Junction table | `lookup-table` | Many-to-many |
| Related collections | `json-construction` | Comments, reviews |

### Step 4: Design Table Structure
1. **Single-entity tables**: One MySQL table → One DynamoDB table
2. **Multi-entity tables**: Multiple related MySQL tables → One DynamoDB table
3. **Partition key design**: Ensure even distribution
4. **Sort key design**: Support range queries and hierarchies

### Step 5: Generate Contract JSON
Follow the schema structure with proper join specifications.

## Pattern Implementation Examples

### Example 1: E-commerce Product Catalog

**Source Schema:**
```sql
-- Categories with hierarchy
CREATE TABLE categories (
  id INT PRIMARY KEY,
  name VARCHAR(100),
  parent_id INT,
  FOREIGN KEY (parent_id) REFERENCES categories(id)
);

-- Products with category reference
CREATE TABLE products (
  id INT PRIMARY KEY,
  name VARCHAR(200),
  category_id INT,
  price DECIMAL(10,2),
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- Product reviews
CREATE TABLE reviews (
  id INT PRIMARY KEY,
  product_id INT,
  user_id INT,
  rating INT,
  comment TEXT,
  created_at TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id)
);
```

**Migration Contract:**
```json
{
  "tables": [
    {
      "table": "Categories",
      "type": "single-entity",
      "source_table": "categories",
      "pk": "category_name",
      "sk": null,
      "attributes": [
        {
          "name": "category_name",
          "type": "S",
          "source_table": "categories",
          "source_column": "name"
        },
        {
          "name": "parent_name",
          "type": "S",
          "source_table": "categories",
          "source_column": "parent_id",
          "join": {
            "type": "self-join",
            "join_alias": "parent_cat",
            "join_condition": "parent_cat.id = categories.parent_id",
            "select_column": "parent_cat.name",
            "null_value": "ROOT"
          }
        }
      ],
      "satisfies": ["Get category hierarchy", "List categories by parent"],
      "estimated_item_size_bytes": 150
    },
    {
      "table": "Products",
      "type": "single-entity",
      "source_table": "products",
      "pk": "product_id",
      "sk": null,
      "gsis": [
        {
          "index_name": "CategoryIndex",
          "pk": "category_name",
          "sk": "product_name"
        }
      ],
      "attributes": [
        {
          "name": "product_id",
          "type": "S",
          "source_table": "products",
          "source_column": "id"
        },
        {
          "name": "product_name",
          "type": "S",
          "source_table": "products",
          "source_column": "name"
        },
        {
          "name": "category_name",
          "type": "S",
          "source_table": "products",
          "source_column": "category_id",
          "join": {
            "type": "foreign-key",
            "target_table": "categories",
            "join_condition": "categories.id = products.category_id",
            "select_column": "categories.name"
          }
        },
        {
          "name": "price",
          "type": "N",
          "source_table": "products",
          "source_column": "price"
        },
        {
          "name": "recent_reviews",
          "type": "S",
          "source_table": "products",
          "source_column": "id",
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
                "created_at": "reviews.created_at"
              }
            }
          }
        }
      ],
      "satisfies": ["Get product details", "List products by category", "Search products"],
      "estimated_item_size_bytes": 800
    }
  ]
}
```

### Example 2: Multi-Entity User Data

**Source Schema:**
```sql
CREATE TABLE users (
  id INT PRIMARY KEY,
  username VARCHAR(50),
  email VARCHAR(100)
);

CREATE TABLE user_preferences (
  user_id INT PRIMARY KEY,
  theme VARCHAR(20),
  notifications BOOLEAN,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE user_addresses (
  id INT PRIMARY KEY,
  user_id INT,
  type ENUM('billing', 'shipping'),
  address_line1 VARCHAR(200),
  city VARCHAR(100),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

**Migration Contract:**
```json
{
  "tables": [
    {
      "table": "UserData",
      "type": "multi-entity",
      "entities": [
        {
          "entity_type": "USER",
          "source_table": "users",
          "pk_template": "USER#{id}",
          "sk_template": "PROFILE",
          "attributes": [
            {
              "name": "username",
              "type": "S",
              "source_table": "users",
              "source_column": "username"
            },
            {
              "name": "email",
              "type": "S",
              "source_table": "users",
              "source_column": "email"
            }
          ]
        },
        {
          "entity_type": "PREFERENCES",
          "source_table": "user_preferences",
          "pk_template": "USER#{user_id}",
          "sk_template": "PREFERENCES",
          "attributes": [
            {
              "name": "theme",
              "type": "S",
              "source_table": "user_preferences",
              "source_column": "theme"
            },
            {
              "name": "notifications",
              "type": "BOOL",
              "source_table": "user_preferences",
              "source_column": "notifications"
            }
          ]
        },
        {
          "entity_type": "ADDRESS",
          "source_table": "user_addresses",
          "pk_template": "USER#{user_id}",
          "sk_template": "ADDRESS#{type}",
          "attributes": [
            {
              "name": "address_line1",
              "type": "S",
              "source_table": "user_addresses",
              "source_column": "address_line1"
            },
            {
              "name": "city",
              "type": "S",
              "source_table": "user_addresses",
              "source_column": "city"
            }
          ]
        }
      ],
      "satisfies": ["Get user profile", "Get user preferences", "Get user addresses"],
      "estimated_item_size_bytes": 400
    }
  ]
}
```

## Validation Checklist

Before finalizing a migration contract, verify:

### Schema Compliance
- [ ] JSON validates against `migration_contract_schema.json`
- [ ] All required fields are present
- [ ] Attribute types match DynamoDB types (S, N, B, etc.)
- [ ] Join patterns follow correct structure

### Data Integrity
- [ ] All foreign key relationships are handled
- [ ] Null value handling is specified for optional joins
- [ ] Calculated fields have proper aggregation logic
- [ ] Multi-entity tables have consistent PK/SK templates

### Performance Optimization
- [ ] Partition keys provide good distribution
- [ ] GSIs support required access patterns
- [ ] JSON construction has reasonable limits
- [ ] Chain joins are minimized

### Access Pattern Coverage
- [ ] All access patterns from requirements are satisfied
- [ ] Each table lists which patterns it supports
- [ ] GSI designs enable efficient queries
- [ ] Denormalization decisions are justified

## Common Pitfalls and Solutions

### 1. Hot Partitions
**Problem**: All items have same partition key
**Solution**: Include discriminating value in PK (user_id, date, etc.)

### 2. Missing Join Data
**Problem**: Join returns null for required fields
**Solution**: Use conditional joins with appropriate else_value

### 3. Large JSON Objects
**Problem**: JSON construction creates items > 400KB
**Solution**: Add limits and pagination to construction

### 4. Complex Chain Joins
**Problem**: Multi-hop joins are slow and complex
**Solution**: Consider denormalizing intermediate results

### 5. Inconsistent Naming
**Problem**: Attribute names don't follow conventions
**Solution**: Use consistent naming patterns (snake_case, camelCase)

## Testing Strategy

### 1. Schema Validation
```bash
# Validate contract against schema
jsonschema -i migrationContract.json migration_contract_schema.json
```

### 2. Sample Data Testing
- Create small sample datasets
- Run migration with contract
- Verify join results are correct
- Check data types and formats

### 3. Performance Testing
- Test with realistic data volumes
- Measure migration time per pattern type
- Validate DynamoDB item sizes
- Check GSI query performance

## Integration with Migration Tools

The migration contract integrates with:

1. **View Generator** (`generate_mysql_views.py`)
   - Creates MySQL views based on join specifications
   - Handles all join patterns automatically
   - Generates proper SQL for complex transformations

2. **Data Migration Pipeline**
   - Reads contract to understand transformations
   - Executes joins and calculations
   - Loads data into DynamoDB with proper formatting

3. **Validation Tools**
   - Schema validation against JSON schema
   - Data integrity checks
   - Performance monitoring

This comprehensive approach ensures that migration contracts can handle any relational data scenario when migrating from MySQL to DynamoDB.