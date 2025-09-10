# Backend Data Access Patterns and Test Structure Analysis

## Repository Pattern Analysis

### Common Repository Interface Pattern
All repositories follow consistent patterns with these common methods:

#### Standard CRUD Operations
- `findById(id)` - Retrieve single entity by primary key
- `create(data)` - Create new entity, return created entity
- `update(id, data)` - Update existing entity, return updated entity
- `delete(id)` - Delete entity, return boolean success
- `findAll()` - Retrieve all entities (with optional filtering)

#### Existence Checks
- `existsBy{Field}(value)` - Check if entity exists by specific field
- `findBy{Field}(value)` - Find entity by specific field

### Repository Implementation Details

#### UserRepository Methods
```typescript
- findById(id: number): Promise<User | null>
- findByUsername(username: string): Promise<User | null>
- findByEmail(email: string): Promise<User | null>
- create(userData: CreateUserRequest & { password_hash: string }): Promise<User>
- update(id: number, userData: UpdateUserRequest): Promise<User | null>
- delete(id: number): Promise<boolean>
- upgradeToSeller(id: number): Promise<User | null>
- existsByUsername(username: string): Promise<boolean>
- existsByEmail(email: string): Promise<boolean>
```

#### ProductRepository Methods
```typescript
- createProduct(sellerId: number, productData: CreateProductRequest): Promise<Product>
- getProductById(productId: number): Promise<Product | null>
- getProductWithDetails(productId: number): Promise<ProductWithDetails | null>
- updateProduct(productId: number, sellerId: number, productData: UpdateProductRequest): Promise<Product | null>
- deleteProduct(productId: number, sellerId: number): Promise<boolean>
- getProductsBySeller(sellerId: number): Promise<Product[]>
- searchProducts(filters: ProductSearchFilters): Promise<ProductListResponse>
- updateInventory(productId: number, quantity: number): Promise<boolean>
```

#### OrderRepository Methods
```typescript
- createOrder(userId: number, orderData: CreateOrderRequest): Promise<Order>
- getOrderById(orderId: number): Promise<Order | null>
- getOrdersByUser(userId: number): Promise<Order[]>
- updateOrderStatus(orderId: number, status: string): Promise<Order | null>
- getOrderWithItems(orderId: number): Promise<OrderWithItems | null>
```

#### CategoryRepository Methods
```typescript
- findAll(): Promise<Category[]>
- findById(id: number): Promise<Category | null>
- create(categoryData: CreateCategoryRequest): Promise<Category>
- update(id: number, categoryData: UpdateCategoryRequest): Promise<Category | null>
- delete(id: number): Promise<boolean>
- findByName(name: string): Promise<Category | null>
- getHierarchy(): Promise<CategoryHierarchy[]>
```

#### ShoppingCartRepository Methods
```typescript
- getCartByUserId(userId: number): Promise<ShoppingCartItem[]>
- addToCart(userId: number, productId: number, quantity: number): Promise<ShoppingCartItem>
- updateCartItem(userId: number, productId: number, quantity: number): Promise<ShoppingCartItem | null>
- removeFromCart(userId: number, productId: number): Promise<boolean>
- clearCart(userId: number): Promise<boolean>
- getCartTotal(userId: number): Promise<number>
```

### Database Connection Patterns

#### Connection Pool Usage
- **Standard Queries**: Use `pool.execute()` for simple queries
- **Tracked Queries**: Use `executeWithTracking()` for performance monitoring
- **Transactions**: Use `pool.getConnection()` for multi-statement transactions

#### Error Handling Pattern
```typescript
try {
  // Database operation
  const [rows] = await pool.execute(sql, params);
  // Process results
  return result;
} catch (error) {
  console.error('Error description:', error);
  throw error; // Re-throw for service layer handling
}
```

#### Data Mapping Pattern
- Private `mapDbRowTo{Entity}()` methods convert database rows to TypeScript models
- Handle type conversions (e.g., tinyint to boolean)
- Ensure consistent data structure across the application

## Service Layer Integration

### Service-Repository Relationship
Services instantiate repositories in their constructors:

```typescript
export class ProductService {
  private productRepository: ProductRepository;

  constructor() {
    this.productRepository = new ProductRepository();
  }
  // Service methods use this.productRepository
}
```

### Service Layer Responsibilities
1. **Input Validation** - Validate request data before repository calls
2. **Business Logic** - Implement business rules and workflows
3. **Error Handling** - Convert repository errors to business-appropriate errors
4. **Data Transformation** - Transform data between API and repository formats
5. **Coordination** - Coordinate multiple repository calls for complex operations

### Dependency Injection Pattern
- Services create their own repository instances
- No external dependency injection framework
- Configuration injected through environment variables
- Database connection shared through singleton pool

## Testing Infrastructure Analysis

### Unit Testing Patterns

#### Repository Unit Tests
- **Mocking Strategy**: Mock the database pool using Jest
- **Test Structure**: Arrange-Act-Assert pattern
- **Coverage**: All public methods with success and error cases
- **Isolation**: Each test is independent with fresh mocks

```typescript
// Mock pattern used in all repository tests
jest.mock('../../../config/database', () => ({
  pool: {
    execute: jest.fn()
  },
  executeWithTracking: jest.fn(),
}));
```

#### Service Unit Tests
- **Mocking Strategy**: Mock repository dependencies
- **Business Logic Focus**: Test validation, error handling, data transformation
- **Error Scenarios**: Test all error conditions and edge cases

### Integration Testing Patterns

#### Database Integration Tests
- **Real Database**: Use actual MySQL database for testing
- **Isolated Database**: Each test type uses separate database
- **Automatic Setup**: Database schema and data automatically configured
- **Cleanup**: Automatic cleanup after each test

```typescript
// Integration test setup pattern
beforeAll(async () => {
  await setupIntegrationTests();
}, 30000);

beforeEach(async () => {
  // Clean up test data
  await pool.execute('DELETE FROM users WHERE username LIKE ?', ['test_%']);
});
```

#### Service Integration Tests
- **Real Dependencies**: Use actual repositories and database
- **End-to-End Workflows**: Test complete business operations
- **Data Persistence**: Verify data is correctly saved and retrieved

### End-to-End Testing Patterns

#### API Testing
- **Real Server**: Start actual Express server for testing
- **HTTP Requests**: Use Supertest for HTTP testing
- **Complete Workflows**: Test full user journeys
- **Authentication**: Test JWT token generation and validation

### Test Configuration

#### Test Database Naming
- Unit Tests: No database (mocked)
- Integration Tests: `online_shopping_store_test_integration`
- E2E Tests: `online_shopping_store_test_e2e`

#### Test Framework Configuration
- **Jest**: Primary testing framework with TypeScript support
- **Supertest**: HTTP testing for API endpoints
- **Custom Helpers**: Database setup, server management, test utilities
- **Coverage Reporting**: HTML reports with interactive dashboard

## Abstraction Layer Design Implications

### Interface Requirements
Based on the analysis, the abstraction layer needs:

1. **Repository Interfaces** - Abstract all discovered repository methods
2. **Consistent Return Types** - Maintain exact return type compatibility
3. **Error Handling** - Preserve error throwing patterns
4. **Async Patterns** - All methods are async and return Promises
5. **Transaction Support** - Support for multi-statement operations

### Implementation Considerations

#### Method Signature Preservation
- All repository methods must maintain exact signatures
- Return types must be identical (Promise<T | null>, Promise<T[]>, etc.)
- Parameter types must match exactly
- Error handling patterns must be preserved

#### Connection Management
- Abstract connection pooling concepts
- Support both simple queries and transactions
- Maintain performance monitoring capabilities
- Handle connection lifecycle properly

#### Data Mapping
- Abstract database-specific data type conversions
- Maintain consistent model structures
- Support complex queries with joins
- Handle null/undefined values consistently

### Testing Strategy Preservation
- Unit tests should continue to mock at the repository level
- Integration tests should work with both database implementations
- E2E tests should remain unchanged
- Test database isolation must be maintained

## Conclusion

The backend follows consistent patterns that make it well-suited for abstraction:

1. **Consistent Repository Pattern** - All repositories follow the same interface patterns
2. **Clear Separation** - Services depend only on repository interfaces, not implementations
3. **Comprehensive Testing** - Existing test structure can be preserved
4. **Error Handling** - Consistent error patterns across all repositories
5. **Configuration Management** - Environment-based configuration supports multiple implementations

The next step is to generate specific requirements and design documents based on these discovered patterns.
