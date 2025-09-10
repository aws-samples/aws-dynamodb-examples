# Dual-Database Abstraction Layer Design

## Architecture Overview

The dual-database abstraction layer implements a factory pattern with abstract interfaces to support both MySQL and DynamoDB implementations while preserving exact existing behavior.

```
┌─────────────────────────────────────────────────────────────┐
│                     Service Layer                          │
│  AuthService │ ProductService │ OrderService │ ...         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Database Factory                          │
│              DatabaseFactory.create()                      │
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
┌─────────────────────────┐    ┌─────────────────────────┐
│   MySQL Implementation │    │  DynamoDB Implementation│
│                         │    │                         │
│  MySQLUserRepository    │    │  DynamoDBUserRepository │
│  MySQLProductRepository │    │  DynamoDBProductRepo... │
│  MySQLOrderRepository   │    │  DynamoDBOrderRepo...   │
│  MySQLCategoryRepo...   │    │  DynamoDBCategoryRepo...│
│  MySQLShoppingCartRepo..│    │  DynamoDBShoppingCart...│
└─────────────────────────┘    └─────────────────────────┘
                              
┌─────────────────────────────────────────────────────────────┐
│                 Abstract Interfaces                        │
│  IUserRepository │ IProductRepository │ IOrderRepository   │
│  ICategoryRepository │ IShoppingCartRepository            │
└─────────────────────────────────────────────────────────────┘
```

## File Structure

```
backend/src/
├── database/
│   ├── interfaces/           # Abstract repository interfaces
│   │   ├── IUserRepository.ts
│   │   ├── IProductRepository.ts
│   │   ├── IOrderRepository.ts
│   │   ├── ICategoryRepository.ts
│   │   └── IShoppingCartRepository.ts
│   ├── implementations/      # Concrete implementations
│   │   ├── mysql/           # MySQL implementations
│   │   │   ├── MySQLUserRepository.ts
│   │   │   ├── MySQLProductRepository.ts
│   │   │   ├── MySQLOrderRepository.ts
│   │   │   ├── MySQLCategoryRepository.ts
│   │   │   └── MySQLShoppingCartRepository.ts
│   │   └── dynamodb/        # DynamoDB stub implementations
│   │       ├── DynamoDBUserRepository.ts
│   │       ├── DynamoDBProductRepository.ts
│   │       ├── DynamoDBOrderRepository.ts
│   │       ├── DynamoDBCategoryRepository.ts
│   │       └── DynamoDBShoppingCartRepository.ts
│   ├── factory/             # Factory pattern implementation
│   │   └── DatabaseFactory.ts
│   └── config/              # Database configuration
│       └── DatabaseConfig.ts
└── config/
    └── database.ts          # Updated to use factory
```

## Interface Design

### Abstract Repository Interfaces

Each repository interface defines the contract that both MySQL and DynamoDB implementations must follow:

#### IUserRepository Interface
```typescript
export interface IUserRepository {
  findById(id: number): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(userData: CreateUserRequest & { password_hash: string }): Promise<User>;
  update(id: number, userData: UpdateUserRequest): Promise<User | null>;
  delete(id: number): Promise<boolean>;
  upgradeToSeller(id: number): Promise<User | null>;
  existsByUsername(username: string): Promise<boolean>;
  existsByEmail(email: string): Promise<boolean>;
}
```

#### IProductRepository Interface
```typescript
export interface IProductRepository {
  createProduct(sellerId: number, productData: CreateProductRequest): Promise<Product>;
  getProductById(productId: number): Promise<Product | null>;
  getProductWithDetails(productId: number): Promise<ProductWithDetails | null>;
  updateProduct(productId: number, sellerId: number, productData: UpdateProductRequest): Promise<Product | null>;
  deleteProduct(productId: number, sellerId: number): Promise<boolean>;
  getProductsBySeller(sellerId: number): Promise<Product[]>;
  searchProducts(filters: ProductSearchFilters): Promise<ProductListResponse>;
  updateInventory(productId: number, quantity: number): Promise<boolean>;
}
```

#### IOrderRepository Interface
```typescript
export interface IOrderRepository {
  createOrder(userId: number, orderData: CreateOrderRequest): Promise<Order>;
  getOrderById(orderId: number): Promise<Order | null>;
  getOrdersByUser(userId: number): Promise<Order[]>;
  updateOrderStatus(orderId: number, status: string): Promise<Order | null>;
  getOrderWithItems(orderId: number): Promise<OrderWithItems | null>;
}
```

#### ICategoryRepository Interface
```typescript
export interface ICategoryRepository {
  findAll(): Promise<Category[]>;
  findById(id: number): Promise<Category | null>;
  create(categoryData: CreateCategoryRequest): Promise<Category>;
  update(id: number, categoryData: UpdateCategoryRequest): Promise<Category | null>;
  delete(id: number): Promise<boolean>;
  findByName(name: string): Promise<Category | null>;
  getHierarchy(): Promise<CategoryHierarchy[]>;
}
```

#### IShoppingCartRepository Interface
```typescript
export interface IShoppingCartRepository {
  getCartByUserId(userId: number): Promise<ShoppingCartItem[]>;
  addToCart(userId: number, productId: number, quantity: number): Promise<ShoppingCartItem>;
  updateCartItem(userId: number, productId: number, quantity: number): Promise<ShoppingCartItem | null>;
  removeFromCart(userId: number, productId: number): Promise<boolean>;
  clearCart(userId: number): Promise<boolean>;
  getCartTotal(userId: number): Promise<number>;
}
```

## Implementation Design

### MySQL Implementation

MySQL implementations wrap existing repository classes to preserve exact behavior:

#### MySQLUserRepository Implementation
```typescript
import { UserRepository } from '../../repositories/UserRepository';
import { IUserRepository } from '../interfaces/IUserRepository';
import { User, CreateUserRequest, UpdateUserRequest } from '../../models/User';

export class MySQLUserRepository implements IUserRepository {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  async findById(id: number): Promise<User | null> {
    return this.userRepository.findById(id);
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.userRepository.findByUsername(username);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findByEmail(email);
  }

  async create(userData: CreateUserRequest & { password_hash: string }): Promise<User> {
    return this.userRepository.create(userData);
  }

  async update(id: number, userData: UpdateUserRequest): Promise<User | null> {
    return this.userRepository.update(id, userData);
  }

  async delete(id: number): Promise<boolean> {
    return this.userRepository.delete(id);
  }

  async upgradeToSeller(id: number): Promise<User | null> {
    return this.userRepository.upgradeToSeller(id);
  }

  async existsByUsername(username: string): Promise<boolean> {
    return this.userRepository.existsByUsername(username);
  }

  async existsByEmail(email: string): Promise<boolean> {
    return this.userRepository.existsByEmail(email);
  }
}
```

### DynamoDB Stub Implementation

DynamoDB implementations provide stubs with implementation guidance for stage-04:

#### DynamoDBUserRepository Stub
```typescript
import { IUserRepository } from '../interfaces/IUserRepository';
import { User, CreateUserRequest, UpdateUserRequest } from '../../models/User';

export class DynamoDBUserRepository implements IUserRepository {
  
  async findById(id: number): Promise<User | null> {
    // TODO: Stage-04 Implementation
    // DynamoDB Design: Use PK=USER#{id}, SK=#META
    // Query: GetItem with PK=USER#{id} and SK=#META
    throw new Error('DynamoDB implementation not yet available - will be implemented in stage-04');
  }

  async findByUsername(username: string): Promise<User | null> {
    // TODO: Stage-04 Implementation  
    // DynamoDB Design: Use GSI with PK=username
    // Query: Query GSI1 where GSI1PK=username
    throw new Error('DynamoDB implementation not yet available - will be implemented in stage-04');
  }

  async findByEmail(email: string): Promise<User | null> {
    // TODO: Stage-04 Implementation
    // DynamoDB Design: Use GSI with PK=email
    // Query: Query GSI2 where GSI2PK=email
    throw new Error('DynamoDB implementation not yet available - will be implemented in stage-04');
  }

  async create(userData: CreateUserRequest & { password_hash: string }): Promise<User> {
    // TODO: Stage-04 Implementation
    // DynamoDB Design: PutItem with PK=USER#{id}, SK=#META
    // Include GSI attributes for username and email lookups
    throw new Error('DynamoDB implementation not yet available - will be implemented in stage-04');
  }

  async update(id: number, userData: UpdateUserRequest): Promise<User | null> {
    // TODO: Stage-04 Implementation
    // DynamoDB Design: UpdateItem with PK=USER#{id}, SK=#META
    // Update only provided fields using UpdateExpression
    throw new Error('DynamoDB implementation not yet available - will be implemented in stage-04');
  }

  async delete(id: number): Promise<boolean> {
    // TODO: Stage-04 Implementation
    // DynamoDB Design: DeleteItem with PK=USER#{id}, SK=#META
    // Consider cascade deletes for related data
    throw new Error('DynamoDB implementation not yet available - will be implemented in stage-04');
  }

  async upgradeToSeller(id: number): Promise<User | null> {
    // TODO: Stage-04 Implementation
    // DynamoDB Design: UpdateItem to set is_seller=true
    throw new Error('DynamoDB implementation not yet available - will be implemented in stage-04');
  }

  async existsByUsername(username: string): Promise<boolean> {
    // TODO: Stage-04 Implementation
    // DynamoDB Design: Query GSI1 with Select=COUNT
    throw new Error('DynamoDB implementation not yet available - will be implemented in stage-04');
  }

  async existsByEmail(email: string): Promise<boolean> {
    // TODO: Stage-04 Implementation
    // DynamoDB Design: Query GSI2 with Select=COUNT
    throw new Error('DynamoDB implementation not yet available - will be implemented in stage-04');
  }
}
```

## Factory Pattern Implementation

### DatabaseFactory Design
```typescript
import { IUserRepository } from '../interfaces/IUserRepository';
import { IProductRepository } from '../interfaces/IProductRepository';
import { IOrderRepository } from '../interfaces/IOrderRepository';
import { ICategoryRepository } from '../interfaces/ICategoryRepository';
import { IShoppingCartRepository } from '../interfaces/IShoppingCartRepository';

import { MySQLUserRepository } from '../implementations/mysql/MySQLUserRepository';
import { MySQLProductRepository } from '../implementations/mysql/MySQLProductRepository';
import { MySQLOrderRepository } from '../implementations/mysql/MySQLOrderRepository';
import { MySQLCategoryRepository } from '../implementations/mysql/MySQLCategoryRepository';
import { MySQLShoppingCartRepository } from '../implementations/mysql/MySQLShoppingCartRepository';

import { DynamoDBUserRepository } from '../implementations/dynamodb/DynamoDBUserRepository';
import { DynamoDBProductRepository } from '../implementations/dynamodb/DynamoDBProductRepository';
import { DynamoDBOrderRepository } from '../implementations/dynamodb/DynamoDBOrderRepository';
import { DynamoDBCategoryRepository } from '../implementations/dynamodb/DynamoDBCategoryRepository';
import { DynamoDBShoppingCartRepository } from '../implementations/dynamodb/DynamoDBShoppingCartRepository';

export type DatabaseType = 'mysql' | 'dynamodb';

export class DatabaseFactory {
  private static databaseType: DatabaseType;

  static initialize(databaseType: DatabaseType): void {
    DatabaseFactory.databaseType = databaseType;
  }

  static createUserRepository(): IUserRepository {
    switch (DatabaseFactory.databaseType) {
      case 'mysql':
        return new MySQLUserRepository();
      case 'dynamodb':
        return new DynamoDBUserRepository();
      default:
        throw new Error(`Unsupported database type: ${DatabaseFactory.databaseType}`);
    }
  }

  static createProductRepository(): IProductRepository {
    switch (DatabaseFactory.databaseType) {
      case 'mysql':
        return new MySQLProductRepository();
      case 'dynamodb':
        return new DynamoDBProductRepository();
      default:
        throw new Error(`Unsupported database type: ${DatabaseFactory.databaseType}`);
    }
  }

  static createOrderRepository(): IOrderRepository {
    switch (DatabaseFactory.databaseType) {
      case 'mysql':
        return new MySQLOrderRepository();
      case 'dynamodb':
        return new DynamoDBOrderRepository();
      default:
        throw new Error(`Unsupported database type: ${DatabaseFactory.databaseType}`);
    }
  }

  static createCategoryRepository(): ICategoryRepository {
    switch (DatabaseFactory.databaseType) {
      case 'mysql':
        return new MySQLCategoryRepository();
      case 'dynamodb':
        return new DynamoDBCategoryRepository();
      default:
        throw new Error(`Unsupported database type: ${DatabaseFactory.databaseType}`);
    }
  }

  static createShoppingCartRepository(): IShoppingCartRepository {
    switch (DatabaseFactory.databaseType) {
      case 'mysql':
        return new MySQLShoppingCartRepository();
      case 'dynamodb':
        return new DynamoDBShoppingCartRepository();
      default:
        throw new Error(`Unsupported database type: ${DatabaseFactory.databaseType}`);
    }
  }
}
```

## Configuration Design

### Database Configuration Schema
```typescript
export interface DatabaseConfig {
  type: DatabaseType;
  mysql?: MySQLConfig;
  dynamodb?: DynamoDBConfig;
}

export interface MySQLConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  connectionLimit: number;
  acquireTimeout: number;
  timeout: number;
}

export interface DynamoDBConfig {
  region: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  endpoint?: string; // For local development
  tableName: string;
}

export class DatabaseConfigManager {
  private static config: DatabaseConfig;

  static initialize(): DatabaseConfig {
    const databaseType = (process.env.DATABASE_TYPE as DatabaseType) || 'mysql';
    
    const config: DatabaseConfig = {
      type: databaseType
    };

    if (databaseType === 'mysql') {
      config.mysql = {
        host: process.env.DB_HOST || '127.0.0.1',
        port: parseInt(process.env.DB_PORT || '3306'),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'online_shopping_store',
        connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10'),
        acquireTimeout: parseInt(process.env.DB_ACQUIRE_TIMEOUT || '60000'),
        timeout: parseInt(process.env.DB_TIMEOUT || '60000'),
      };
    } else if (databaseType === 'dynamodb') {
      config.dynamodb = {
        region: process.env.AWS_REGION || 'us-east-1',
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        endpoint: process.env.DYNAMODB_ENDPOINT, // For local development
        tableName: process.env.DYNAMODB_TABLE_NAME || 'online_shopping_store',
      };
    }

    DatabaseConfigManager.config = config;
    return config;
  }

  static getConfig(): DatabaseConfig {
    if (!DatabaseConfigManager.config) {
      return DatabaseConfigManager.initialize();
    }
    return DatabaseConfigManager.config;
  }
}
```

## Service Integration

### Service Constructor Changes
Services need minimal changes to use the factory:

#### Before (Current)
```typescript
export class AuthService {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }
  // ... rest of service methods unchanged
}
```

#### After (With Abstraction)
```typescript
import { DatabaseFactory } from '../database/factory/DatabaseFactory';
import { IUserRepository } from '../database/interfaces/IUserRepository';

export class AuthService {
  private userRepository: IUserRepository;

  constructor() {
    this.userRepository = DatabaseFactory.createUserRepository();
  }
  // ... rest of service methods unchanged
}
```

## Application Initialization

### Updated Application Startup
```typescript
// In app.ts or index.ts
import { DatabaseFactory } from './database/factory/DatabaseFactory';
import { DatabaseConfigManager } from './database/config/DatabaseConfig';

// Initialize database configuration
const config = DatabaseConfigManager.initialize();

// Initialize database factory
DatabaseFactory.initialize(config.type);

// Rest of application initialization remains unchanged
```

## Error Handling Design

### Error Types
```typescript
export class DatabaseError extends Error {
  constructor(message: string, public originalError?: Error) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class NotImplementedError extends Error {
  constructor(method: string, implementation: string) {
    super(`${method} not implemented for ${implementation} - will be available in stage-04`);
    this.name = 'NotImplementedError';
  }
}

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}
```

## Testing Strategy

### Unit Testing
- Mock at the interface level instead of concrete repository level
- Factory returns mocked implementations for testing
- Preserve all existing test patterns

### Integration Testing
- Test with actual MySQL implementation
- DynamoDB stubs throw appropriate errors
- Configuration testing for both database types

### Test Configuration Updates
```typescript
// In test setup
import { DatabaseFactory } from '../database/factory/DatabaseFactory';

beforeAll(() => {
  // Force MySQL for integration tests
  DatabaseFactory.initialize('mysql');
});
```

## Implementation Plan

### Phase 1: Interface Creation
1. Create all abstract repository interfaces
2. Ensure interfaces match existing repository method signatures exactly
3. Add comprehensive TypeScript typing

### Phase 2: MySQL Implementation
1. Create MySQL wrapper implementations
2. Preserve exact existing behavior
3. Ensure zero performance impact

### Phase 3: DynamoDB Stubs
1. Create stub implementations with proper error messages
2. Add implementation guidance comments
3. Document DynamoDB design patterns

### Phase 4: Factory Implementation
1. Implement factory pattern
2. Add configuration management
3. Integrate with existing application startup

### Phase 5: Service Integration
1. Update service constructors to use factory
2. Ensure no changes to service logic
3. Preserve all existing functionality

### Phase 6: Testing and Validation
1. Run all existing tests to ensure compatibility
2. Add new tests for abstraction layer components
3. Validate configuration management
4. Performance testing

## Stage-04 Preparation

### DynamoDB Implementation Guidance
Each stub method includes detailed comments about:
- DynamoDB table design patterns
- Key structures (PK/SK patterns)
- GSI requirements for lookups
- Query vs Scan operations
- Batch operations for efficiency

### Configuration Readiness
- DynamoDB configuration schema defined
- Environment variable mapping established
- Local development support planned

### Migration Considerations
- Data migration patterns documented
- Dual-write strategies for zero-downtime migration
- Rollback procedures defined

## Conclusion

This design provides a comprehensive abstraction layer that:
- Preserves exact existing MySQL behavior
- Prepares for efficient DynamoDB implementation
- Maintains full backward compatibility
- Supports feature flag-based database selection
- Enables zero-downtime migration in stage-04
