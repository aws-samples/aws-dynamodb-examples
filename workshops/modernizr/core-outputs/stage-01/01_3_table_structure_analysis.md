# Complete Table Structure Analysis

**CRITICAL**: This represents the complete source data model that must be migrated to DynamoDB.

## Database Overview

The `online_shopping_store` database contains **6 core tables** that implement a complete e-commerce data model with hierarchical categories, multi-vendor products, user management, shopping cart functionality, and order processing capabilities.

### Database Statistics
- **Total Tables**: 6
- **Foreign Key Relationships**: 8
- **Indexes**: 20+ (including full-text search)
- **Current Data Volume**: 4 users, 25 categories, 6 products, 0 orders, 0 cart items

## Complete Table Definitions

### 1. Users Table

**Purpose**: Central user management with seller capabilities

```sql
CREATE TABLE users (
    id INT NOT NULL AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(50) NULL,
    last_name VARCHAR(50) NULL,
    is_seller TINYINT(1) NULL DEFAULT 0,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);
```

**Constraints and Indexes**:
- **Primary Key**: `id` (auto-increment)
- **Unique Constraints**: `username`, `email`
- **Indexes**: 
  - `idx_username` (BTREE) - Login performance
  - `idx_email` (BTREE) - Email lookup
  - `idx_is_seller` (BTREE) - Seller filtering
- **Data Types**: 
  - `is_seller`: Boolean flag for seller capabilities
  - Timestamps with auto-update functionality

### 2. Categories Table

**Purpose**: Hierarchical product categorization system

```sql
CREATE TABLE categories (
    id INT NOT NULL AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    parent_id INT NULL,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);
```

**Constraints and Indexes**:
- **Primary Key**: `id` (auto-increment)
- **Foreign Keys**: `parent_id` → `categories.id` (self-referencing)
- **Indexes**:
  - `idx_name` (BTREE) - Category name lookup
  - `idx_parent_id` (BTREE) - Hierarchy navigation
- **Hierarchy**: Self-referencing tree structure for unlimited depth

### 3. Products Table

**Purpose**: Core product catalog with seller and category relationships

```sql
CREATE TABLE products (
    id INT NOT NULL AUTO_INCREMENT,
    seller_id INT NOT NULL,
    category_id INT NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT NULL,
    price DECIMAL(10,2) NOT NULL,
    inventory_quantity INT NOT NULL DEFAULT 0,
    image_url VARCHAR(500) NULL,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);
```

**Constraints and Indexes**:
- **Primary Key**: `id` (auto-increment)
- **Foreign Keys**: 
  - `seller_id` → `users.id`
  - `category_id` → `categories.id`
- **Indexes**:
  - `idx_seller_id` (BTREE) - Seller product lookup
  - `idx_category_id` (BTREE) - Category filtering
  - `idx_name` (BTREE) - Product name search
  - `idx_price` (BTREE) - Price range filtering
  - `idx_inventory` (BTREE) - Stock availability
  - `idx_search` (FULLTEXT) - Full-text search on name + description
- **Data Types**:
  - `price`: DECIMAL(10,2) for precise currency handling
  - `description`: TEXT for unlimited product descriptions

### 4. Orders Table

**Purpose**: Customer order management and tracking

```sql
CREATE TABLE orders (
    id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    status ENUM('pending','completed','cancelled') NULL DEFAULT 'pending',
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);
```

**Constraints and Indexes**:
- **Primary Key**: `id` (auto-increment)
- **Foreign Keys**: `user_id` → `users.id`
- **Indexes**:
  - `idx_user_id` (BTREE) - User order history
  - `idx_status` (BTREE) - Order status filtering
  - `idx_created_at` (BTREE) - Chronological ordering
- **Data Types**:
  - `status`: ENUM with predefined order states
  - `total_amount`: DECIMAL(10,2) for precise totals

### 5. Order Items Table

**Purpose**: Line items for orders with historical pricing

```sql
CREATE TABLE order_items (
    id INT NOT NULL AUTO_INCREMENT,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    price_at_time DECIMAL(10,2) NOT NULL,
    PRIMARY KEY (id)
);
```

**Constraints and Indexes**:
- **Primary Key**: `id` (auto-increment)
- **Foreign Keys**: 
  - `order_id` → `orders.id`
  - `product_id` → `products.id`
- **Indexes**:
  - `idx_order_id` (BTREE) - Order line items lookup
  - `idx_product_id` (BTREE) - Product sales history
- **Data Types**:
  - `price_at_time`: Historical price preservation for order integrity

### 6. Shopping Carts Table

**Purpose**: Persistent shopping cart with user-product relationships

```sql
CREATE TABLE shopping_carts (
    id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);
```

**Constraints and Indexes**:
- **Primary Key**: `id` (auto-increment)
- **Foreign Keys**: 
  - `user_id` → `users.id`
  - `product_id` → `products.id`
- **Unique Constraints**: `unique_user_product` (user_id, product_id) - Prevents duplicate cart entries
- **Indexes**:
  - `idx_user_id` (BTREE) - User cart lookup
  - `product_id` (BTREE) - Product cart analysis

## Entity Relationships and Cardinalities

### Primary Relationships

#### 1. Users ↔ Products (Seller Relationship)
- **Relationship**: One-to-Many
- **Cardinality**: 1 User : N Products
- **Foreign Key**: `products.seller_id` → `users.id`
- **Business Rule**: Users with `is_seller = 1` can create products

#### 2. Categories ↔ Products
- **Relationship**: One-to-Many
- **Cardinality**: 1 Category : N Products
- **Foreign Key**: `products.category_id` → `categories.id`
- **Business Rule**: Every product must belong to a category

#### 3. Categories ↔ Categories (Hierarchy)
- **Relationship**: Self-Referencing One-to-Many
- **Cardinality**: 1 Parent Category : N Child Categories
- **Foreign Key**: `categories.parent_id` → `categories.id`
- **Business Rule**: NULL parent_id indicates root category

#### 4. Users ↔ Orders (Customer Relationship)
- **Relationship**: One-to-Many
- **Cardinality**: 1 User : N Orders
- **Foreign Key**: `orders.user_id` → `users.id`
- **Business Rule**: All users can place orders

#### 5. Orders ↔ Order Items
- **Relationship**: One-to-Many
- **Cardinality**: 1 Order : N Order Items
- **Foreign Key**: `order_items.order_id` → `orders.id`
- **Business Rule**: Orders contain multiple products as line items

#### 6. Products ↔ Order Items
- **Relationship**: One-to-Many
- **Cardinality**: 1 Product : N Order Items
- **Foreign Key**: `order_items.product_id` → `products.id`
- **Business Rule**: Products can appear in multiple orders

#### 7. Users ↔ Shopping Carts
- **Relationship**: One-to-Many
- **Cardinality**: 1 User : N Cart Items
- **Foreign Key**: `shopping_carts.user_id` → `users.id`
- **Business Rule**: Each user has one persistent cart

#### 8. Products ↔ Shopping Carts
- **Relationship**: One-to-Many
- **Cardinality**: 1 Product : N Cart Items
- **Foreign Key**: `shopping_carts.product_id` → `products.id`
- **Business Rule**: Products can be in multiple user carts

### Composite Relationships

#### User-Product Cart Uniqueness
- **Constraint**: `unique_user_product` (user_id, product_id)
- **Business Rule**: Each user can have only one cart entry per product
- **Implementation**: Quantity updates instead of duplicate entries

## Current Database Schema Structure

### Hierarchical Category Example
```
Electronics (id=1, parent_id=NULL)
├── Laptops (id=7, parent_id=1)
├── Smartphones (id=8, parent_id=1)
├── Tablets (id=9, parent_id=1)
└── Headphones (id=10, parent_id=1)

Clothing & Accessories (id=5, parent_id=NULL)
Home & Kitchen (id=3, parent_id=NULL)
Books (id=4, parent_id=NULL)
Garden & Outdoor (id=2, parent_id=NULL)
Sports & Outdoors (id=6, parent_id=NULL)
```

### Data Model Characteristics

#### 1. Multi-Vendor Architecture
- **Seller Management**: Users can be upgraded to sellers
- **Product Ownership**: Each product belongs to a specific seller
- **Seller Isolation**: Sellers can only manage their own products

#### 2. Flexible Categorization
- **Unlimited Depth**: Self-referencing hierarchy supports any depth
- **Root Categories**: 6 main categories (Electronics, Clothing, etc.)
- **Subcategories**: Electronics has 4 subcategories (Laptops, Smartphones, etc.)

#### 3. Order Processing Model
- **Order Header**: Orders table contains totals and status
- **Order Details**: Order_items table contains line items with historical pricing
- **Price Preservation**: `price_at_time` maintains order integrity despite price changes

#### 4. Shopping Cart Persistence
- **User-Centric**: Each user maintains a persistent cart
- **Quantity Management**: Single entry per user-product combination
- **Timestamp Tracking**: Created/updated timestamps for cart analytics

#### 5. Search and Performance Optimization
- **Full-Text Search**: Products table has FULLTEXT index on name + description
- **Performance Indexes**: Strategic indexes on frequently queried columns
- **Foreign Key Indexes**: Automatic indexes for relationship performance

## Index Strategy Analysis

### Primary Performance Indexes
1. **Product Search**: `idx_search` (FULLTEXT) - Supports text search queries
2. **Category Navigation**: `idx_category_id` - Product filtering by category
3. **Seller Products**: `idx_seller_id` - Seller product management
4. **Price Filtering**: `idx_price` - Price range queries
5. **Inventory Checks**: `idx_inventory` - Stock availability queries
6. **Order History**: `idx_user_id` on orders - User order lookup
7. **Order Status**: `idx_status` - Order management queries

### Unique Constraints Strategy
1. **User Identity**: Username and email uniqueness
2. **Cart Management**: User-product uniqueness in shopping carts
3. **Data Integrity**: Primary keys on all tables

## Data Volume and Growth Patterns

### Current State
- **Users**: 4 (minimal test data)
- **Categories**: 25 (complete category hierarchy)
- **Products**: 6 (sample product catalog)
- **Orders**: 0 (no order history)
- **Cart Items**: 0 (no active carts)

### Growth Implications
- **Category Stability**: 25 categories likely stable
- **User Growth**: Linear growth expected
- **Product Growth**: Exponential growth potential (multi-vendor)
- **Order Volume**: High transaction volume expected
- **Cart Activity**: High read/write activity on shopping carts

## Migration Considerations for DynamoDB

### 1. Relationship Complexity
- **8 Foreign Key Relationships**: Require denormalization strategy
- **Self-Referencing Hierarchy**: Categories need special handling
- **Many-to-Many Patterns**: Order items and cart items need composite keys

### 2. Query Pattern Support
- **Full-Text Search**: Products search requires external search service
- **Hierarchical Queries**: Category tree navigation needs optimization
- **Range Queries**: Price and date filtering need GSI support

### 3. Data Consistency Requirements
- **ACID Transactions**: Order processing needs transaction support
- **Referential Integrity**: Foreign key constraints need application-level enforcement
- **Unique Constraints**: Username/email uniqueness needs careful design

### 4. Performance Requirements
- **High Read Volume**: Product browsing and search
- **Moderate Write Volume**: Cart updates and order processing
- **Real-Time Inventory**: Stock level consistency critical

**CLEAR STATEMENT**: This represents the complete source data model that must be migrated to DynamoDB. All 6 tables, 8 relationships, and associated constraints must be supported in the target DynamoDB design to maintain application functionality.
