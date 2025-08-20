# Task 2.1: Dual-Write Entities Documentation

## Overview
Complete documentation of all entities requiring dual-write implementation for MySQL to DynamoDB migration.

## Entity Summary
- **Total Entities**: 5
- **Total Write Operations**: 16
- **DynamoDB Tables**: 3 (Users multi-entity, Products single-entity, Categories single-entity)
- **Key Challenge**: MySQL auto-increment IDs must be generated first, then used for DynamoDB

## Detailed Entity Analysis

### 1. User Entity
**Repository**: `IUserRepository` → `MySQLUserRepository` + `DynamoDBUserRepository`

**MySQL Structure**:
- Primary Key: `id` (auto-increment integer)
- Unique Keys: `email`, `username`

**DynamoDB Structure** (Users table):
- PK: `{email}`, SK: `#META`
- GSI1: GSI1PK=`{id}`, GSI1SK=`{id}` (ID lookups)
- GSI2: GSI2PK=`{username}`, GSI2SK=`{username}` (username lookups)

**Write Operations**:
1. `create(userData)` - Create new user
2. `update(id, userData)` - Update user information  
3. `delete(id)` - Delete user
4. `upgradeToSeller(id)` - Upgrade to seller status

**Dual-Write Complexity**: Medium - Requires email lookup for DynamoDB PK

### 2. Product Entity
**Repository**: `IProductRepository` → `MySQLProductRepository` + `DynamoDBProductRepository`

**MySQL Structure**:
- Primary Key: `id` (auto-increment integer)
- Foreign Keys: `seller_id`, `category_id`

**DynamoDB Structure** (Products table):
- PK: `{id}`, SK: `#META`
- GSI1: GSI1PK=`{category_id}`, GSI1SK=`{name}` (category browsing)
- GSI2: GSI2PK=`{seller_id}`, GSI2SK=`{name}` (seller products)

**Write Operations**:
1. `createProduct(sellerId, productData)` - Create new product
2. `updateProduct(productId, sellerId, productData)` - Update product
3. `deleteProduct(productId, sellerId)` - Delete product
4. `updateInventory(productId, quantity)` - Update inventory

**Dual-Write Complexity**: Low - Direct ID mapping

### 3. Order Entity
**Repository**: `IOrderRepository` → `MySQLOrderRepository` + `DynamoDBOrderRepository`

**MySQL Structure**:
- Primary Key: `id` (auto-increment integer)
- Foreign Key: `user_id`

**DynamoDB Structure** (Users table - ORDER entity):
- PK: `{user_email}`, SK: `ORDER#{created_at}#{order_id}`
- GSI3: GSI3PK=`{order_id}`, GSI3SK=`{order_id}` (order ID lookups)
- Denormalized: `order_items` as JSON array

**Write Operations**:
1. `createOrder(userId, totalAmount)` - Create new order
2. `createOrderItem(orderId, productId, quantity, priceAtTime)` - Add order item
3. `updateOrderStatus(orderId, status)` - Update order status

**Dual-Write Complexity**: High - Requires user email lookup + denormalization

### 4. Category Entity
**Repository**: `ICategoryRepository` → `MySQLCategoryRepository` + `DynamoDBCategoryRepository`

**MySQL Structure**:
- Primary Key: `id` (auto-increment integer)
- Hierarchy: `parent_id` (self-referencing)

**DynamoDB Structure** (Categories table):
- PK: `{parent_name|ROOT}`, SK: `{category_name}`
- GSI1: GSI1PK=`{category_id}`, GSI1SK=`{category_id}` (ID lookups)

**Write Operations**:
1. `create(categoryData)` - Create new category
2. `update(id, categoryData)` - Update category
3. `delete(id)` - Delete category

**Dual-Write Complexity**: Medium - Requires parent name resolution

### 5. ShoppingCart Entity
**Repository**: `IShoppingCartRepository` → `MySQLShoppingCartRepository` + `DynamoDBShoppingCartRepository`

**MySQL Structure**:
- Composite Primary Key: `user_id` + `product_id`
- Foreign Keys: `user_id`, `product_id`

**DynamoDB Structure** (Users table - CART entity):
- PK: `{user_email}`, SK: `CART#{product_id}`
- Denormalized: `product_name`, `product_price`

**Write Operations**:
1. `addItem(userId, productId, quantity)` - Add/update cart item
2. `updateItemQuantity(userId, productId, quantity)` - Update quantity
3. `removeItem(userId, productId)` - Remove cart item
4. `clearCart(userId)` - Clear entire cart

**Dual-Write Complexity**: High - Requires user email + product denormalization

## Dual-Write Implementation Strategy

### 1. MySQL-First Approach
**Required due to auto-increment ID dependency**
```
1. Execute MySQL operation (get auto-generated ID)
2. Transform data for DynamoDB format
3. Execute DynamoDB operation
4. Handle rollback if DynamoDB fails
```

### 2. Key Mapping Requirements
- **User**: MySQL `id` → DynamoDB requires `email` for PK
- **Product**: MySQL `id` → DynamoDB `id` (direct)
- **Order**: MySQL `id` → DynamoDB `user_email` + `ORDER#{timestamp}#{id}`
- **Category**: MySQL `id` → DynamoDB `parent_name` + `category_name`
- **Cart**: MySQL `user_id,product_id` → DynamoDB `user_email` + `CART#{product_id}`

### 3. Denormalization Requirements
- **CART entities**: Need `product_name` and `product_price` from Product table
- **ORDER entities**: Need `order_items` as JSON array with product details

### 4. Error Handling Strategy
- **MySQL Success + DynamoDB Failure**: Rollback MySQL transaction
- **MySQL Failure**: No DynamoDB operation attempted
- **Partial Success**: Log inconsistency for reconciliation

## Implementation Phases

### Phase 1: Wrapper Infrastructure
- Create `DualWriteWrapper` base class
- Implement transaction coordination
- Add error handling and rollback logic

### Phase 2: Entity-Specific Wrappers
- Implement wrapper for each entity type
- Handle key mapping transformations
- Implement denormalization logic

### Phase 3: Integration & Testing
- Integrate wrappers with existing repositories
- Add comprehensive test coverage
- Validate data consistency

## Validation Checklist
- ✅ All 5 entities identified from migration contract
- ✅ All 16 write operations documented
- ✅ Key mapping challenges identified
- ✅ Denormalization requirements specified
- ✅ Error handling strategy defined
- ✅ Implementation phases planned

## Next Steps
1. Implement `DualWriteWrapper` base infrastructure
2. Create entity-specific dual-write wrappers
3. Add comprehensive testing for dual-write operations
4. Integrate with feature flag system for controlled rollout
