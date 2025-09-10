# Stage 04 - DynamoDB Implementation Plan

## Executive Summary

This document provides detailed implementation specifications for replacing the 5 DynamoDB repository stubs with real implementations based on the migration contract from stage 02 and the interface definitions from stage 03.

## Implementation Strategy

### Core Approach
- **Reference-Based Implementation**: Use migration contract as design guide for table structures and access patterns
- **Interface Compliance**: Maintain exact method signatures from stage 03 interfaces
- **Direct Implementation**: Write DynamoDB operations directly without parsing migration contract
- **Preserve MySQL IDs**: Cast MySQL-generated IDs to appropriate DynamoDB data types
- **Zero Breaking Changes**: All 383 existing tests must continue passing

### Table Mapping from Migration Contract
1. **Users Table**: Multi-entity table (USER, CART, ORDER entities)
2. **Products Table**: Single-entity table 
3. **Categories Table**: Single-entity table with hierarchy support

## Repository Implementation Specifications

### 1. DynamoDBUserRepository Implementation

#### Table Design (from migration contract)
- **Table Name**: `Users`
- **Primary Key**: `PK = {email}`, `SK = #META`
- **GSI1**: `GSI1PK = {id}`, `GSI1SK = {id}` (for ID lookups)
- **GSI2**: `GSI2PK = {username}`, `GSI2SK = {username}` (for username lookups)

#### Method Implementations

**findById(id: number): Promise<User | null>**
- **DynamoDB Operation**: Query GSI1 where `GSI1PK = id.toString()`
- **Key Pattern**: GSI1PK="{id}", GSI1SK="{id}"
- **Return**: Transform DynamoDB item to User model or null

**findByUsername(username: string): Promise<User | null>**
- **DynamoDB Operation**: Query GSI2 where `GSI2PK = username`
- **Key Pattern**: GSI2PK="{username}", GSI2SK="{username}"
- **Return**: Transform DynamoDB item to User model or null

**findByEmail(email: string): Promise<User | null>**
- **DynamoDB Operation**: GetItem with `PK = email`, `SK = #META`
- **Key Pattern**: PK="{email}", SK="#META"
- **Return**: Transform DynamoDB item to User model or null

**create(userData: CreateUserRequest): Promise<User>**
- **DynamoDB Operation**: PutItem with condition expression to prevent duplicates
- **Item Structure**: Include all attributes from migration contract
- **ID Generation**: Use MySQL-compatible ID generation, cast to string
- **GSI Attributes**: Set GSI1PK/GSI1SK to ID, GSI2PK/GSI2SK to username

**update(id: number, updates: UpdateUserRequest): Promise<User>**
- **DynamoDB Operation**: UpdateItem using GSI1 to find by ID, then update main table
- **Process**: Query GSI1 to get email, then UpdateItem on main table
- **Attributes**: Update only provided fields, maintain GSI consistency

**delete(id: number): Promise<boolean>**
- **DynamoDB Operation**: Query GSI1 to find email, then DeleteItem from main table
- **Return**: true if item was deleted, false if not found

**upgradeToSeller(id: number): Promise<User>**
- **DynamoDB Operation**: UpdateItem to set `is_seller = true`
- **Process**: Query GSI1 to find email, then update main table

**existsByUsername(username: string): Promise<boolean>**
- **DynamoDB Operation**: Query GSI2 with projection of only key attributes
- **Return**: true if item exists, false otherwise

**existsByEmail(email: string): Promise<boolean>**
- **DynamoDB Operation**: GetItem with projection of only key attributes
- **Return**: true if item exists, false otherwise

### 2. DynamoDBProductRepository Implementation

#### Table Design (from migration contract)
- **Table Name**: `Products`
- **Primary Key**: `PK = {id}`, `SK = #META`
- **GSI1**: `GSI1PK = {category_id}`, `GSI1SK = {name}` (category browsing)
- **GSI2**: `GSI2PK = {seller_id}`, `GSI2SK = {name}` (seller products)

#### Method Implementations

**createProduct(productData: CreateProductRequest, sellerId: number): Promise<Product>**
- **DynamoDB Operation**: PutItem with generated ID
- **ID Generation**: Use MySQL-compatible ID generation, cast to string
- **GSI Attributes**: Set GSI1PK to category_id, GSI2PK to seller_id

**getProductById(id: number): Promise<Product | null>**
- **DynamoDB Operation**: GetItem with `PK = id.toString()`, `SK = #META`
- **Return**: Transform DynamoDB item to Product model or null

**getProductWithDetails(id: number): Promise<ProductWithDetails | null>**
- **DynamoDB Operation**: GetItem with full projection
- **Return**: Transform to ProductWithDetails model with denormalized data

**updateProduct(id: number, updates: UpdateProductRequest, sellerId: number): Promise<Product>**
- **DynamoDB Operation**: UpdateItem with condition expression for seller ownership
- **Validation**: Ensure seller_id matches sellerId parameter

**deleteProduct(id: number, sellerId: number): Promise<boolean>**
- **DynamoDB Operation**: DeleteItem with condition expression for seller ownership
- **Return**: true if deleted, false if not found or not owned

**getProductsBySeller(sellerId: number, pagination: PaginationOptions): Promise<PaginatedResponse<Product>>**
- **DynamoDB Operation**: Query GSI2 where `GSI2PK = sellerId.toString()`
- **Pagination**: Use DynamoDB pagination with LastEvaluatedKey

**searchProducts(searchTerm: string, filters: ProductFilters, pagination: PaginationOptions): Promise<PaginatedResponse<ProductWithDetails>>**
- **DynamoDB Operation**: Scan with FilterExpression for text search
- **Filters**: Apply category and price filters using FilterExpression
- **Note**: Consider external search service for production

**updateInventory(id: number, quantity: number): Promise<boolean>**
- **DynamoDB Operation**: UpdateItem to set inventory_quantity
- **Return**: true if updated successfully

### 3. DynamoDBOrderRepository Implementation

#### Table Design (from migration contract)
- **Table Name**: `Users` (ORDER entity)
- **Primary Key**: `PK = {user_email}`, `SK = ORDER#{created_at}#{order_id}`
- **GSI3**: `GSI3PK = {order_id}`, `GSI3SK = {order_id}` (order ID lookups)

#### Method Implementations

**createOrder(orderData: CreateOrderRequest): Promise<Order>**
- **DynamoDB Operation**: PutItem in Users table with ORDER entity
- **Key Pattern**: PK=user_email, SK="ORDER#{isodate}#{order_id}"
- **ID Generation**: Use MySQL-compatible ID generation
- **Denormalization**: Store order_items as JSON array

**getOrderById(id: number): Promise<OrderWithDetails | null>**
- **DynamoDB Operation**: Query GSI3 where `GSI3PK = id.toString()`
- **Return**: Transform to OrderWithDetails model

**getUserOrders(userId: number, pagination: PaginationOptions): Promise<PaginatedResponse<OrderSummary>>**
- **DynamoDB Operation**: Query main table where PK=user_email and SK begins_with "ORDER#"
- **Process**: First get user email by ID, then query orders
- **Sort**: Natural sort by SK (chronological order)

**updateOrderStatus(id: number, status: OrderStatus): Promise<boolean>**
- **DynamoDB Operation**: Query GSI3 to find order, then UpdateItem
- **Return**: true if updated successfully

**getOrdersByStatus(status: OrderStatus, pagination: PaginationOptions): Promise<PaginatedResponse<OrderSummary>>**
- **DynamoDB Operation**: Scan with FilterExpression for status
- **Note**: Consider GSI for status queries in production

### 4. DynamoDBCategoryRepository Implementation

#### Table Design (from migration contract)
- **Table Name**: `Categories`
- **Primary Key**: `PK = {parent_name|ROOT}`, `SK = {category_name}`
- **GSI1**: `GSI1PK = {category_id}`, `GSI1SK = {category_id}` (ID lookups)

#### Method Implementations

**findAll(): Promise<Category[]>**
- **DynamoDB Operation**: Scan entire Categories table
- **Return**: Transform all items to Category models

**findById(id: number): Promise<Category | null>**
- **DynamoDB Operation**: Query GSI1 where `GSI1PK = id.toString()`
- **Return**: Transform DynamoDB item to Category model or null

**create(categoryData: CreateCategoryRequest): Promise<Category>**
- **DynamoDB Operation**: PutItem with generated ID
- **Key Logic**: PK = parent_name or "ROOT", SK = category_name
- **GSI Attributes**: Set GSI1PK/GSI1SK to category_id

**update(id: number, updates: UpdateCategoryRequest): Promise<Category | null>**
- **DynamoDB Operation**: Query GSI1 to find category, then UpdateItem
- **Key Handling**: May need to delete/recreate if name changes

**delete(id: number): Promise<boolean>**
- **DynamoDB Operation**: Query GSI1 to find category, then DeleteItem
- **Validation**: Check for child categories first

**existsByName(name: string, excludeId?: number): Promise<boolean>**
- **DynamoDB Operation**: Scan with FilterExpression for category_name
- **Exclusion**: Filter out excludeId if provided

**findByParentId(parentId: number | null): Promise<Category[]>**
- **DynamoDB Operation**: Query main table where PK = parent_name or "ROOT"
- **Process**: If parentId, get parent name first; if null, use "ROOT"

**findRootCategories(): Promise<Category[]>**
- **DynamoDB Operation**: Query main table where `PK = "ROOT"`
- **Return**: All root-level categories

### 5. DynamoDBShoppingCartRepository Implementation

#### Table Design (from migration contract)
- **Table Name**: `Users` (CART entity)
- **Primary Key**: `PK = {user_email}`, `SK = CART#{product_id}`

#### Method Implementations

**getCartItems(userId: number): Promise<ShoppingCartItem[]>**
- **DynamoDB Operation**: Query Users table where PK=user_email and SK begins_with "CART#"
- **Process**: First get user email by ID, then query cart items
- **Return**: Transform to ShoppingCartItem models with denormalized data

**addItem(userId: number, productId: number, quantity: number): Promise<boolean>**
- **DynamoDB Operation**: PutItem or UpdateItem with ADD operation for quantity
- **Key Pattern**: PK=user_email, SK="CART#{product_id}"
- **Denormalization**: Include product_name and price

**updateItemQuantity(userId: number, productId: number, quantity: number): Promise<boolean>**
- **DynamoDB Operation**: UpdateItem to set quantity
- **Special Case**: DeleteItem if quantity is 0

**removeItem(userId: number, productId: number): Promise<boolean>**
- **DynamoDB Operation**: DeleteItem with cart item key
- **Return**: true if item was removed

**clearCart(userId: number): Promise<boolean>**
- **DynamoDB Operation**: Query cart items, then BatchWriteItem to delete all
- **Process**: Get all CART# items for user, then batch delete

**getCartItemCount(userId: number): Promise<number>**
- **DynamoDB Operation**: Query with Count projection
- **Return**: Total count of cart items for user

## Implementation Guidelines

### Error Handling Patterns
- **DynamoDB Errors**: Map to appropriate application errors
- **Conditional Failures**: Handle ConditionalCheckFailedException appropriately
- **Throttling**: Use AWS SDK default retry mechanisms with exponential backoff
- **Not Found**: Return null for single items, empty arrays for collections

### Data Transformation
- **ID Casting**: Convert MySQL integer IDs to DynamoDB strings
- **Date Handling**: Use ISO 8601 format for timestamps
- **JSON Serialization**: Use JSON.stringify/parse for complex attributes
- **Boolean Conversion**: Handle MySQL tinyint to DynamoDB BOOL

### Performance Considerations
- **Batch Operations**: Use BatchGetItem/BatchWriteItem where appropriate
- **Projection**: Use ProjectionExpression to limit data transfer
- **Pagination**: Implement proper pagination with LastEvaluatedKey
- **Consistent Reads**: Use eventually consistent reads by default

### Testing Strategy
- **Interface Compliance**: All existing tests must pass without modification
- **Error Scenarios**: Test DynamoDB-specific error conditions
- **Data Consistency**: Validate data transformations are correct
- **Performance**: Ensure operations complete within reasonable time

## Configuration Requirements

### DynamoDB Client Setup
```typescript
const dynamoDBClient = new DynamoDBClient({
  region: process.env.DYNAMODB_REGION || 'us-east-1',
  endpoint: process.env.DYNAMODB_ENDPOINT, // For local development
  credentials: {
    accessKeyId: process.env.DYNAMODB_ACCESS_KEY_ID,
    secretAccessKey: process.env.DYNAMODB_SECRET_ACCESS_KEY
  }
});
```

### Environment Variables
- `DATABASE_TYPE=dynamodb`
- `DYNAMODB_REGION=us-east-1`
- `DYNAMODB_ENDPOINT=http://localhost:8000` (for local)
- `DYNAMODB_ACCESS_KEY_ID` (optional, use IAM roles in production)
- `DYNAMODB_SECRET_ACCESS_KEY` (optional, use IAM roles in production)

## Success Criteria

### Functional Requirements
- ✅ All 5 DynamoDB repositories implement their interfaces completely
- ✅ All 383 existing unit tests continue to pass
- ✅ Data transformations preserve MySQL compatibility
- ✅ Error handling maintains consistent patterns

### Performance Requirements
- ✅ Repository operations complete within reasonable time limits
- ✅ Pagination works correctly for large datasets
- ✅ Memory usage remains stable under load

### Quality Requirements
- ✅ Code follows existing repository patterns and conventions
- ✅ TypeScript compilation succeeds without errors
- ✅ No breaking changes to existing functionality
- ✅ Comprehensive error handling for DynamoDB-specific scenarios

---

**Implementation Priority**: 
1. DynamoDBUserRepository (foundational)
2. DynamoDBProductRepository (core business logic)
3. DynamoDBCategoryRepository (supporting data)
4. DynamoDBShoppingCartRepository (user experience)
5. DynamoDBOrderRepository (transaction processing)

**Estimated Effort**: 2-3 hours per repository for complete implementation and testing
