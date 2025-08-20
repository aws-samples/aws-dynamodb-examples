# API Access Patterns Analysis

**CRITICAL**: These patterns represent ALL access patterns that must be supported in the DynamoDB design.

## Complete API Endpoints and Data Access Requirements

### 1. Authentication Endpoints (`/api/auth`)

| Method | Endpoint | Auth Required | Data Access Pattern |
|--------|----------|---------------|-------------------|
| POST | `/register` | ❌ | Create user record |
| POST | `/login` | ❌ | Query user by username |
| GET | `/profile` | ✅ | Query user by ID |
| PUT | `/profile` | ✅ | Update user by ID |
| POST | `/upgrade-seller` | ✅ | Update user is_seller flag by ID |
| POST | `/logout` | ✅ | No database operation |
| GET | `/verify` | ✅ | Query user by ID |

### 2. Product Endpoints (`/api/products`)

| Method | Endpoint | Auth Required | Data Access Pattern |
|--------|----------|---------------|-------------------|
| GET | `/` | ❌ | Query products with filters (category_id, seller_id, search, price range, stock) + pagination |
| GET | `/search` | ❌ | Query products by name/description text search + pagination |
| GET | `/category/:categoryId` | ❌ | Query products by category_id + pagination |
| GET | `/:id` | ❌ | Query single product by ID |
| POST | `/` | ✅ (Seller) | Create product record |
| PUT | `/:id` | ✅ (Seller) | Update product by ID (owner validation) |
| DELETE | `/:id` | ✅ (Seller) | Delete product by ID (owner validation) |
| GET | `/seller/my-products` | ✅ (Seller) | Query products by seller_id + pagination |
| PUT | `/:id/inventory` | ✅ (Seller) | Update product inventory by ID (owner validation) |
| GET | `/seller/stats` | ✅ (Seller) | Aggregate query: count products by seller_id |
| POST | `/upload-image` | ✅ (Seller) | File upload (no database operation) |

### 3. Category Endpoints (`/api/categories`)

| Method | Endpoint | Auth Required | Data Access Pattern |
|--------|----------|---------------|-------------------|
| GET | `/search` | ❌ | Query categories by name text search |
| GET | `/flat` | ❌ | Query all categories (flat list) |
| GET | `/roots` | ❌ | Query categories where parent_id is NULL |
| GET | `/:id/children` | ❌ | Query categories by parent_id |
| GET | `/:id/path` | ❌ | Recursive query: category path from root to category |
| GET | `/:id` | ❌ | Query single category by ID |
| GET | `/` | ❌ | Query all categories in hierarchical tree structure |
| POST | `/` | ✅ (Seller) | Create category record |
| PUT | `/:id` | ✅ (Seller) | Update category by ID |
| DELETE | `/:id` | ✅ (Seller) | Delete category by ID (with child validation) |

### 4. Order Endpoints (`/api/orders`)

| Method | Endpoint | Auth Required | Data Access Pattern |
|--------|----------|---------------|-------------------|
| POST | `/checkout` | ✅ | Create order + order_items from cart, update product inventory |
| GET | `/` | ✅ | Query orders by user_id + pagination |
| GET | `/:orderId` | ✅ | Query order by ID (owner validation) |
| PUT | `/:orderId/cancel` | ✅ | Update order status by ID (owner validation) |
| GET | `/user/summary` | ✅ | Aggregate query: order statistics by user_id |
| PUT | `/:orderId/status` | ✅ | Update order status by ID (seller validation) |
| GET | `/user/recent` | ✅ | Query recent orders by user_id (limited) |
| GET | `/user/search` | ✅ | Query orders by user_id with text search |
| GET | `/checkout/validate` | ✅ | Validate cart inventory before checkout |

### 5. Shopping Cart Endpoints (`/api/cart`)

| Method | Endpoint | Auth Required | Data Access Pattern |
|--------|----------|---------------|-------------------|
| GET | `/` | ✅ | Query cart items by user_id |
| POST | `/items` | ✅ | Create/update cart item by user_id + product_id |
| PUT | `/items/:productId` | ✅ | Update cart item quantity by user_id + product_id |
| DELETE | `/items/:productId` | ✅ | Delete cart item by user_id + product_id |
| DELETE | `/` | ✅ | Delete all cart items by user_id |
| GET | `/summary` | ✅ | Aggregate query: cart summary by user_id |
| GET | `/validate` | ✅ | Validate cart inventory by user_id |

### 6. Seller Endpoints (`/api/seller`)

| Method | Endpoint | Auth Required | Data Access Pattern |
|--------|----------|---------------|-------------------|
| POST | `/upgrade` | ✅ | Update user is_seller flag by ID |
| GET | `/profile` | ✅ (Seller) | Query user by ID |
| GET | `/dashboard` | ✅ (Seller) | Query user by ID + aggregate seller statistics |
| PUT | `/profile` | ✅ (Seller) | Update user profile by ID |

## Entity Relationships

### Core Entities and Their Relationships

1. **Users**
   - Primary Key: `id`
   - Unique Keys: `username`, `email`
   - Relationships:
     - One-to-Many with Products (as seller)
     - One-to-Many with Orders (as customer)
     - One-to-Many with Cart Items

2. **Categories**
   - Primary Key: `id`
   - Self-referencing: `parent_id` → `categories.id`
   - Relationships:
     - One-to-Many with Products
     - Hierarchical tree structure (parent-child)

3. **Products**
   - Primary Key: `id`
   - Foreign Keys: `category_id` → `categories.id`, `seller_id` → `users.id`
   - Relationships:
     - Many-to-One with Categories
     - Many-to-One with Users (seller)
     - One-to-Many with Order Items
     - One-to-Many with Cart Items

4. **Orders**
   - Primary Key: `id`
   - Foreign Key: `user_id` → `users.id`
   - Relationships:
     - Many-to-One with Users
     - One-to-Many with Order Items

5. **Order Items**
   - Composite Key: `order_id` + `product_id`
   - Foreign Keys: `order_id` → `orders.id`, `product_id` → `products.id`
   - Relationships:
     - Many-to-One with Orders
     - Many-to-One with Products

6. **Cart Items**
   - Composite Key: `user_id` + `product_id`
   - Foreign Keys: `user_id` → `users.id`, `product_id` → `products.id`
   - Relationships:
     - Many-to-One with Users
     - Many-to-One with Products

## Enumerated Access Patterns for DynamoDB Design (48 Total API Methods)

### User Management (7 patterns)
- **AP1**: Create user account (POST /api/auth/register)
- **AP2**: Authenticate user by username (POST /api/auth/login)
- **AP3**: Get user profile by user ID (GET /api/auth/profile)
- **AP4**: Update user profile by user ID (PUT /api/auth/profile)
- **AP5**: Upgrade user to seller status (POST /api/auth/upgrade-seller)
- **AP6**: Logout user (POST /api/auth/logout)
- **AP7**: Verify user token (GET /api/auth/verify)

### Product Catalog (12 patterns)
- **AP8**: Get all products with filtering and pagination (GET /api/products)
- **AP9**: Search products by text (GET /api/products/search)
- **AP10**: Get products by category (GET /api/products/category/:categoryId)
- **AP11**: Get single product by ID (GET /api/products/:id)
- **AP12**: Create new product (POST /api/products)
- **AP13**: Update product (PUT /api/products/:id)
- **AP14**: Delete product (DELETE /api/products/:id)
- **AP15**: Get products by seller ID (GET /api/products/seller/my-products)
- **AP16**: Update product inventory (PUT /api/products/:id/inventory)
- **AP17**: Get seller product statistics (GET /api/products/seller/stats)
- **AP18**: Upload product image (POST /api/products/upload-image)

### Category Management (9 patterns)
- **AP19**: Search categories by name (GET /api/categories/search)
- **AP20**: Get all categories flat list (GET /api/categories/flat)
- **AP21**: Get root categories (GET /api/categories/roots)
- **AP22**: Get child categories by parent ID (GET /api/categories/:id/children)
- **AP23**: Get category path breadcrumb (GET /api/categories/:id/path)
- **AP24**: Get single category by ID (GET /api/categories/:id)
- **AP25**: Get category hierarchy tree (GET /api/categories)
- **AP26**: Create category (POST /api/categories)
- **AP27**: Update category (PUT /api/categories/:id)
- **AP28**: Delete category (DELETE /api/categories/:id)

### Order Management (9 patterns)
- **AP29**: Create order from cart checkout (POST /api/orders/checkout)
- **AP30**: Get user's order history with pagination (GET /api/orders)
- **AP31**: Get single order by ID (GET /api/orders/:orderId)
- **AP32**: Cancel order (PUT /api/orders/:orderId/cancel)
- **AP33**: Get user order summary/statistics (GET /api/orders/user/summary)
- **AP34**: Update order status (PUT /api/orders/:orderId/status)
- **AP35**: Get recent orders for user (GET /api/orders/user/recent)
- **AP36**: Search user orders by text (GET /api/orders/user/search)
- **AP37**: Validate checkout eligibility (GET /api/orders/checkout/validate)

### Shopping Cart (7 patterns)
- **AP38**: Get user's cart with items (GET /api/cart)
- **AP39**: Add item to cart (POST /api/cart/items)
- **AP40**: Update cart item quantity (PUT /api/cart/items/:productId)
- **AP41**: Remove item from cart (DELETE /api/cart/items/:productId)
- **AP42**: Clear entire cart (DELETE /api/cart)
- **AP43**: Get cart summary (GET /api/cart/summary)
- **AP44**: Validate cart inventory (GET /api/cart/validate)

### Seller Operations (4 patterns)
- **AP45**: Upgrade to seller (POST /api/seller/upgrade)
- **AP46**: Get seller profile (GET /api/seller/profile)
- **AP47**: Get seller dashboard statistics (GET /api/seller/dashboard)
- **AP48**: Update seller profile (PUT /api/seller/profile)

## Key Access Pattern Characteristics

### Query Types Required:
1. **Point Lookups**: Single item by primary key
2. **Range Queries**: Pagination, date ranges, price ranges
3. **Filter Queries**: Multiple filter conditions
4. **Text Search**: Product names, descriptions, category names
5. **Hierarchical Queries**: Category trees, paths
6. **Aggregate Queries**: Counts, sums, statistics
7. **Composite Key Queries**: Cart items, order items

### Performance Requirements:
1. **High Read Volume**: Product browsing, search
2. **Moderate Write Volume**: Cart operations, orders
3. **Real-time Inventory**: Stock validation
4. **Pagination Support**: All list endpoints
5. **Search Performance**: Text-based product/category search

### Security Requirements:
1. **Owner Validation**: Users can only access their own data
2. **Role-based Access**: Seller vs regular user permissions
3. **Authentication**: JWT token validation

**CRITICAL STATEMENT**: These patterns represent ALL access patterns that must be supported in the DynamoDB design. Any DynamoDB table structure must efficiently support all 48 enumerated access patterns while maintaining performance, security, and consistency requirements.
