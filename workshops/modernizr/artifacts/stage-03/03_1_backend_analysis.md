# Backend Codebase Analysis - Stage 03

## Overview
Comprehensive analysis of the Node.js/TypeScript backend application to understand architecture, data access patterns, and implementation details for dual-database abstraction layer design.

## Application Architecture

### Technology Stack
- **Runtime**: Node.js with TypeScript 5.8+
- **Framework**: Express.js 5.1+
- **Database**: MySQL 8.0+ with mysql2 driver
- **Authentication**: JWT with bcrypt password hashing
- **Testing**: Jest with comprehensive unit/integration/e2e testing
- **Development**: Hot reload with nodemon, ESLint for code quality

### Project Structure
```
backend/src/
├── config/              # Application configuration
│   ├── database.ts      # MySQL connection pool and configuration
│   └── env.ts          # Environment variable management
├── database/           # Schema, migrations, CLI tools
│   ├── schema.sql      # Database schema definition
│   ├── seed.ts         # Sample data seeding
│   ├── init.ts         # Database initialization
│   └── cli.ts          # Database management CLI
├── middleware/         # Express middleware
│   ├── auth.ts         # JWT authentication middleware
│   ├── seller.ts       # Seller authorization middleware
│   ├── validation.ts   # Input validation middleware
│   └── errorHandler.ts # Global error handling
├── models/             # TypeScript interfaces and data models
│   ├── User.ts         # User-related interfaces
│   ├── Product.ts      # Product-related interfaces
│   ├── Order.ts        # Order-related interfaces
│   ├── Category.ts     # Category-related interfaces
│   └── ShoppingCart.ts # Shopping cart interfaces
├── repositories/       # Data access layer (MySQL integration)
│   ├── UserRepository.ts
│   ├── ProductRepository.ts
│   ├── OrderRepository.ts
│   ├── CategoryRepository.ts
│   └── ShoppingCartRepository.ts
├── services/           # Business logic and service layer
│   ├── AuthService.ts
│   ├── ProductService.ts
│   ├── OrderService.ts
│   ├── CategoryService.ts
│   ├── ShoppingCartService.ts
│   └── PaymentService.ts
├── routes/             # RESTful API endpoints
│   ├── auth.ts
│   ├── products.ts
│   ├── orders.ts
│   ├── categories.ts
│   ├── cart.ts
│   └── seller.ts
├── utils/              # Utility functions
│   └── performanceMonitor.ts
├── __tests__/          # Comprehensive test suite
│   ├── unit/           # Fast, isolated unit tests
│   ├── integration/    # Component interaction tests
│   └── e2e/            # Full workflow end-to-end tests
└── test-configs/       # Advanced testing configurations
```

## Data Access Layer Analysis

### Current Database Configuration
- **Connection Pool**: MySQL connection pool with optimized settings
- **Pool Configuration**: 10 connections max, 15-minute idle timeout
- **Security**: Parameterized queries, no multiple statements
- **Performance**: Query tracking, connection health checks
- **Character Set**: UTF8MB4 for full Unicode support

### Repository Pattern Implementation
All repositories follow consistent patterns:

#### Common Repository Methods
- `findById(id)` - Find single entity by primary key
- `findAll()` - Retrieve all entities with optional filtering
- `create(data)` - Create new entity
- `update(id, data)` - Update existing entity
- `delete(id)` - Delete entity by ID
- `exists(criteria)` - Check entity existence

#### Repository Classes Identified
1. **UserRepository** - User management and authentication
2. **ProductRepository** - Product catalog management
3. **OrderRepository** - Order processing and history
4. **CategoryRepository** - Product categorization
5. **ShoppingCartRepository** - Shopping cart operations

### Service Layer Architecture
Services encapsulate business logic and coordinate between repositories:

#### Service Classes Identified
1. **AuthService** - Authentication, registration, JWT management
2. **ProductService** - Product business logic, inventory management
3. **OrderService** - Order processing, payment coordination
4. **CategoryService** - Category management, hierarchy handling
5. **ShoppingCartService** - Cart operations, session management
6. **PaymentService** - Payment processing logic

### Database Schema Overview
Based on repository analysis, the database contains:

#### Core Tables
- `users` - User accounts and authentication data
- `products` - Product catalog with seller relationships
- `categories` - Product categorization hierarchy
- `orders` - Customer orders and order metadata
- `order_items` - Order line items linking orders to products
- Shopping cart data (session-based or user-linked)

#### Key Relationships
- Users → Products (seller relationship)
- Products → Categories (categorization)
- Users → Orders (customer relationship)
- Orders → Order Items → Products (order composition)
- Users → Shopping Cart Items (cart ownership)

## Testing Infrastructure Analysis

### Test Architecture
The application follows a comprehensive testing pyramid:

#### Unit Tests (`src/__tests__/unit/`)
- **Speed**: Fast execution (< 10 seconds total)
- **Scope**: Individual functions/classes in isolation
- **Dependencies**: All external dependencies mocked
- **Coverage**: Business logic, error handling, edge cases
- **Database**: No database setup required

#### Integration Tests (`src/__tests__/integration/`)
- **Speed**: Medium execution (< 60 seconds)
- **Scope**: Component interactions with real database
- **Database**: Automatically sets up `online_shopping_store_test_integration`
- **Dependencies**: External services mocked
- **Coverage**: API endpoints, database operations

#### End-to-End Tests (`src/__tests__/e2e/`)
- **Speed**: Comprehensive testing (< 120 seconds)
- **Scope**: Complete user workflows
- **Database**: Automatically builds app and sets up `online_shopping_store_test_e2e`
- **Dependencies**: Real server + database + HTTP requests
- **Coverage**: Critical user journeys

### Test Framework Configuration
- **Jest**: Primary testing framework with TypeScript support
- **Supertest**: HTTP testing for API endpoints
- **Automatic Database Setup**: Each test type uses isolated databases
- **Coverage Reporting**: HTML reports with interactive dashboard
- **Performance Tracking**: Slow test detection and metrics

## Key Implementation Patterns

### Dependency Injection
- Services instantiate their own repositories in constructors
- Configuration injected through environment variables
- Middleware dependencies resolved through Express app setup

### Error Handling
- Custom `AppError` class with error types and HTTP status codes
- Global error handler middleware for consistent error responses
- Repository-level error catching and re-throwing
- Service-level business logic validation

### Security Implementation
- JWT-based authentication with configurable expiration
- bcrypt password hashing with configurable salt rounds
- Input validation middleware using express-validator
- Rate limiting and security headers via helmet
- Parameterized queries for SQL injection prevention

### Performance Optimization
- Connection pooling with health checks
- Query performance tracking and monitoring
- Memory usage monitoring with configurable thresholds
- Automatic connection cleanup and resource management

## Configuration Management

### Environment Variables
The application uses comprehensive environment configuration:

#### Database Configuration
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `DB_CONNECTION_LIMIT`, `DB_ACQUIRE_TIMEOUT`, `DB_TIMEOUT`

#### Security Configuration
- `JWT_SECRET`, `JWT_EXPIRES_IN`
- `BCRYPT_SALT_ROUNDS`
- Rate limiting configuration

#### Performance Configuration
- Memory thresholds for monitoring
- Connection pool settings
- Query timeout settings

## Abstraction Layer Requirements

Based on this analysis, the dual-database abstraction layer needs to:

### Interface Requirements
1. **Repository Interfaces** - Abstract all repository methods
2. **Configuration Interfaces** - Support multiple database types
3. **Connection Management** - Abstract connection pooling
4. **Transaction Support** - Handle database transactions
5. **Error Handling** - Consistent error patterns across databases

### Implementation Requirements
1. **Factory Pattern** - Create appropriate repository implementations
2. **Feature Flags** - Toggle between MySQL and DynamoDB
3. **Configuration Management** - Environment-based database selection
4. **Backward Compatibility** - Preserve existing behavior exactly
5. **Testing Support** - Maintain all existing test patterns

### Integration Points
1. **Service Layer** - Services should remain unchanged
2. **Middleware** - No changes to authentication/authorization
3. **Routes** - No changes to API endpoints
4. **Configuration** - Extend existing configuration system
5. **Testing** - Preserve all existing test infrastructure

## Conclusion

The backend application follows clean architecture principles with clear separation between data access (repositories), business logic (services), and presentation (routes). The comprehensive testing infrastructure and consistent patterns make it well-suited for implementing a dual-database abstraction layer without disrupting existing functionality.

The next step is to analyze the specific data access patterns and test structure to design appropriate abstractions that preserve the existing behavior while enabling DynamoDB integration.
