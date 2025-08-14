# Migration Contract Patterns - Comprehensive Join Support

This document defines comprehensive patterns for handling all types of joins and data transformations in migration contracts. These patterns should be used as context when generating migration contracts in task 4.

## Core Schema Structure

```json
{
  "tables": [
    {
      "table": "string",
      "type": "single-entity|multi-entity",
      "source_table": "string",
      "pk": "string",
      "sk": "string|null",
      "gsis": [...],
      "entities": [...],
      "attributes": [...],
      "satisfies": [...],
      "estimated_item_size_bytes": "number"
    }
  ]
}
```

## Pattern 1: Self-Join (Hierarchical Data)

**Use Case**: Categories with parent-child relationships, organizational hierarchies

```json
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
  ]
}
```

## Pattern 2: Foreign Key Join (Simple Lookup)

**Use Case**: Products referencing categories, orders referencing users

```json
{
  "table": "Products",
  "type": "single-entity",
  "source_table": "products",
  "pk": "product_id",
  "sk": null,
  "attributes": [
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
    }
  ]
}
```

## Pattern 3: Multi-Column Join

**Use Case**: Composite foreign keys, complex relationships

```json
{
  "table": "OrderItems",
  "type": "single-entity",
  "source_table": "order_items",
  "pk": "order_id",
  "sk": "product_id",
  "attributes": [
    {
      "name": "product_details",
      "type": "S",
      "source_table": "order_items",
      "source_column": ["product_id", "variant_id"],
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
  ]
}
```

## Pattern 4: Conditional Join

**Use Case**: Optional relationships, polymorphic associations

```json
{
  "table": "Reviews",
  "type": "single-entity",
  "source_table": "reviews",
  "pk": "review_id",
  "sk": null,
  "attributes": [
    {
      "name": "reviewer_name",
      "type": "S",
      "source_table": "reviews",
      "source_column": "user_id",
      "join": {
        "type": "conditional",
        "condition": "reviews.user_id IS NOT NULL",
        "target_table": "users",
        "join_condition": "users.id = reviews.user_id",
        "select_column": "users.username",
        "else_value": "Anonymous"
      }
    }
  ]
}
```

## Pattern 5: Chain Join (Multi-Hop Relationships)

**Use Case**: User -> Order -> Product relationships, deep hierarchies

```json
{
  "table": "UserProductHistory",
  "type": "single-entity",
  "source_table": "order_items",
  "pk": "user_id",
  "sk": "product_id#order_date",
  "attributes": [
    {
      "name": "user_id",
      "type": "S",
      "source_table": "order_items",
      "source_column": "order_id",
      "join": {
        "type": "chain",
        "joins": [
          {
            "target_table": "orders",
            "join_condition": "orders.id = order_items.order_id",
            "select_column": "orders.user_id"
          }
        ]
      }
    },
    {
      "name": "category_name",
      "type": "S",
      "source_table": "order_items",
      "source_column": "product_id",
      "join": {
        "type": "chain",
        "joins": [
          {
            "target_table": "products",
            "join_condition": "products.id = order_items.product_id",
            "select_column": "products.category_id"
          },
          {
            "target_table": "categories",
            "join_condition": "categories.id = products.category_id",
            "select_column": "categories.name"
          }
        ]
      }
    },
    {
      "name": "product_category_path",
      "type": "S",
      "source_table": "order_items",
      "source_column": "product_id",
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
  ]
}
```

## Pattern 6: Lookup Table Join (Many-to-Many)

**Use Case**: Product tags, user roles, permissions

```json
{
  "table": "ProductTags",
  "type": "single-entity",
  "source_table": "product_tags",
  "pk": "product_id",
  "sk": "tag_name",
  "attributes": [
    {
      "name": "tag_name",
      "type": "S",
      "source_table": "product_tags",
      "source_column": "tag_id",
      "join": {
        "type": "lookup-table",
        "target_table": "tags",
        "join_condition": "tags.id = product_tags.tag_id",
        "select_column": "tags.name"
      }
    }
  ]
}
```

## Pattern 7: JSON Construction (Aggregated Data)

**Use Case**: Denormalizing related records into JSON arrays/objects

```json
{
  "table": "ProductsWithReviews",
  "type": "single-entity",
  "source_table": "products",
  "pk": "product_id",
  "sk": null,
  "attributes": [
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
            "reviewer": "reviews.username",
            "date": "reviews.created_at"
          }
        }
      }
    }
  ]
}
```

## Pattern 8: Multi-Entity Table (Denormalization)

**Use Case**: Combining multiple related entities into single DynamoDB table

```json
{
  "table": "UserData",
  "type": "multi-entity",
  "entities": [
    {
      "entity_type": "USER",
      "source_table": "users",
      "pk_template": "USER#{user_id}",
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
      "entity_type": "USER_PREFERENCES",
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
          "type": "S",
          "source_table": "user_preferences",
          "source_column": "notification_settings"
        }
      ]
    }
  ]
}
```

## Pattern 9: Calculated Fields

**Use Case**: Derived values, computed columns, business logic

```json
{
  "table": "Orders",
  "type": "single-entity",
  "source_table": "orders",
  "pk": "order_id",
  "sk": null,
  "attributes": [
    {
      "name": "total_amount",
      "type": "N",
      "source_table": "orders",
      "source_column": "id",
      "calculation": {
        "type": "aggregate",
        "target_table": "order_items",
        "join_condition": "order_items.order_id = orders.id",
        "operation": "SUM",
        "select_column": "order_items.price * order_items.quantity"
      }
    },
    {
      "name": "status_display",
      "type": "S",
      "source_table": "orders",
      "source_column": "status",
      "calculation": {
        "type": "case",
        "cases": [
          {"when": "status = 'P'", "then": "'Pending'"},
          {"when": "status = 'S'", "then": "'Shipped'"},
          {"when": "status = 'D'", "then": "'Delivered'"}
        ],
        "else": "'Unknown'"
      }
    }
  ]
}
```

## Pattern 10: Time-Based Partitioning

**Use Case**: Time-series data, audit logs, activity tracking

```json
{
  "table": "UserActivity",
  "type": "single-entity",
  "source_table": "user_activities",
  "pk": "user_id",
  "sk": "activity_date#activity_id",
  "attributes": [
    {
      "name": "activity_date",
      "type": "S",
      "source_table": "user_activities",
      "source_column": "created_at",
      "transformation": {
        "type": "date-format",
        "format": "YYYY-MM-DD",
        "source_format": "timestamp"
      }
    },
    {
      "name": "activity_month",
      "type": "S",
      "source_table": "user_activities",
      "source_column": "created_at",
      "transformation": {
        "type": "date-format",
        "format": "YYYY-MM",
        "source_format": "timestamp"
      }
    }
  ],
  "gsis": [
    {
      "index_name": "ActivityByMonth",
      "pk": "activity_month",
      "sk": "user_id#activity_date"
    }
  ]
}
```

## Implementation Guidelines

### 1. Join Type Selection
- **self-join**: Use for hierarchical data within same table
- **foreign-key**: Use for simple 1:1 or N:1 relationships
- **multi-column**: Use for composite keys or complex join conditions
- **conditional**: Use for optional relationships or polymorphic data
- **chain**: Use for multi-hop relationships (A->B->C)
- **lookup-table**: Use for many-to-many relationships
- **json-construction**: Use for denormalizing related collections

### 2. Performance Considerations
- **Limit JSON construction**: Use `limit` parameter to prevent large objects
- **Index chain joins**: Consider GSIs for frequently accessed chain join results
- **Cache lookup tables**: Small lookup tables should be cached in application
- **Batch conditional joins**: Group conditional logic to minimize query complexity

### 3. Data Consistency
- **Null handling**: Always specify `null_value` or `else_value` for optional joins
- **Type safety**: Ensure join results match target attribute types
- **Validation**: Include validation rules for calculated and joined fields

### 4. Migration Execution
- **Dependency order**: Process tables in dependency order (referenced tables first)
- **Batch processing**: Use batch operations for large datasets
- **Error handling**: Include retry logic for failed join operations
- **Monitoring**: Track join performance and success rates

## Usage in Migration Contract Generation

When generating migration contracts:

1. **Identify join patterns** in the source MySQL schema
2. **Select appropriate pattern** from this document
3. **Customize the pattern** for specific use case
4. **Validate join logic** against source data
5. **Test with sample data** before full migration
6. **Document pattern choice** and rationale

This comprehensive pattern library ensures that migration contracts can handle any relational data transformation scenario when migrating from MySQL to DynamoDB.