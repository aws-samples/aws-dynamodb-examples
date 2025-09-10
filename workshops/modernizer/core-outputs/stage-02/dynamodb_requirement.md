# DynamoDB Modeling Session

## Application Overview
- **Domain**: E-commerce platform with multi-vendor support
- **Key Entities**: Users (1:M) Products, Users (1:M) Orders, Orders (1:M) OrderItems, Users (1:M) CartItems, Categories (self-referencing hierarchy), Products (M:1) Categories
- **Business Context**: Online shopping store with seller capabilities, hierarchical product categories, persistent shopping carts, order processing with historical pricing, real-time inventory management
- **Scale**: 1,400 QPS total (100x growth from 1.44 QPS baseline), expecting high read volume with moderate write activity

## Access Patterns Analysis
| Pattern # | Description | RPS (Peak and Average) | Type | Attributes Needed | Key Requirements | Design Considerations | Status |
|-----------|-------------|-----------------|------|-------------------|------------------|----------------------|--------|
| 1 | Create user account | 10 RPS | Write | username, email, password_hash, first_name, last_name, is_seller | Username/email uniqueness | Lookup tables for unique constraints | ✅ |
| 2 | Authenticate user by username | 250 RPS | Read | username, password_hash | <50ms latency, high frequency | Consider caching, username as PK | ✅ |
| 3 | Get user profile by user ID | 5 RPS | Read | user_id, all profile fields | Point lookup | Simple PK lookup | ✅ |
| 4 | Update user profile | 0.3 RPS | Write | user_id, profile fields | Low frequency | Simple update operation | ✅ |
| 5 | Upgrade user to seller | 0.1 RPS | Write | user_id, is_seller flag | Rare operation | Flag update | ✅ |
| 6 | Logout user | 250 RPS | None | session_token | No DB operation | JWT token invalidation | ✅ |
| 7 | Verify user token | 250 RPS | Read | user_id from token | High frequency | Consider JWT stateless | ✅ |
| 8 | Get products with filters/pagination | 420 RPS | Read | category_id, seller_id, price, inventory, search terms | Complex filtering | Multiple GSIs needed | ✅ |
| 9 | Search products by text | 420 RPS | Read | name, description text search | Full-text search | ElasticSearch integration required | ❌ |
| 10 | Get products by category | 100 RPS | Read | category_id, product details | Category filtering | GSI on category_id | ✅ |
| 11 | Get single product by ID | 200 RPS | Read | product_id, all product details | Point lookup, hot partition risk | Product popularity distribution | ⚠️ |
| 12 | Create new product | 0.01 RPS | Write | seller_id, product data | Seller validation | Low frequency seller operation | ✅ |
| 13 | Update product | 0.01 RPS | Write | product_id, seller_id, product fields | Owner validation | Low frequency | ✅ |
| 14 | Delete product | 0.005 RPS | Write | product_id, seller_id | Owner validation | Very rare operation | ✅ |
| 15 | Get products by seller ID | 0.1 RPS | Read | seller_id, product list | Seller management | GSI on seller_id | ✅ |
| 16 | Update product inventory | 0.02 RPS | Write | product_id, inventory_quantity | Real-time inventory | Critical for checkout | ✅ |
| 17 | Get seller product statistics | 0.05 RPS | Read | seller_id, aggregates | Dashboard data | Pre-computed aggregates | ✅ |
| 18 | Upload product image | 0.01 RPS | None | image_file | S3 upload | No DB operation | ✅ |
| 19 | Search categories by name | 10 RPS | Read | category_name | Text search | Simple text matching | ✅ |
| 20 | Get all categories flat list | 50 RPS | Read | all categories | Full list | Consider caching | ✅ |
| 21 | Get root categories | 50 RPS | Read | parent_id = null | Root level | GSI on parent_id | ✅ |
| 22 | Get child categories by parent ID | 30 RPS | Read | parent_id, child categories | Hierarchy navigation | GSI on parent_id | ✅ |
| 23 | Get category path breadcrumb | 20 RPS | Read | category_id, hierarchy path | Breadcrumb navigation | Denormalize path or recursive lookup | ✅ |
| 24 | Get single category by ID | 20 RPS | Read | category_id, category details | Point lookup | Simple PK lookup | ✅ |
| 25 | Get category hierarchy tree | 30 RPS | Read | all categories, hierarchy | Tree structure | Complex hierarchical query | ⚠️ |
| 26 | Create category | 0.001 RPS | Write | category data, parent_id | Admin operation | Very rare, hierarchy validation | ✅ |
| 27 | Update category | 0.001 RPS | Write | category_id, category fields | Admin operation | Very rare | ✅ |
| 28 | Delete category | 0.0005 RPS | Write | category_id | Admin operation | Cascade validation needed | ✅ |
| 29 | Create order from cart checkout | 200 RPS | Write | user_id, cart_items, inventory updates | Transaction required | ACID properties, inventory consistency | ⚠️ |
| 30 | Get user order history with pagination | 50 RPS | Read | user_id, date range | Order history | GSI on user_id, sort by date | ✅ |
| 31 | Get single order by ID | 30 RPS | Read | order_id, user_id | Point lookup with validation | Owner validation required | ✅ |
| 32 | Cancel order | 5 RPS | Write | order_id, user_id, status | Owner validation | Status update | ✅ |
| 33 | Get user order summary/statistics | 10 RPS | Read | user_id, aggregates | Dashboard data | Pre-computed aggregates | ✅ |
| 34 | Update order status | 10 RPS | Write | order_id, seller_id, status | Seller validation | Status management | ✅ |
| 35 | Get recent orders for user | 20 RPS | Read | user_id, recent limit | Recent activity | GSI on user_id, date sort | ✅ |
| 36 | Search user orders by text | 5 RPS | Read | user_id, search text | Order search | Text search within user scope | ❌ |
| 37 | Validate checkout eligibility | 200 RPS | Read | cart_items, inventory | Real-time validation | Inventory consistency critical | ✅ |
| 38 | Get user cart with items | 100 RPS | Read | user_id, cart items | Cart display | GSI on user_id | ✅ |
| 39 | Add item to cart | 175 RPS | Write | user_id, product_id, quantity | High frequency writes | Upsert operation | ✅ |
| 40 | Update cart item quantity | 100 RPS | Write | user_id, product_id, quantity | Frequent updates | Update operation | ✅ |
| 41 | Remove item from cart | 50 RPS | Write | user_id, product_id | Cart management | Delete operation | ✅ |
| 42 | Clear entire cart | 25 RPS | Write | user_id | Batch operation | Delete all user cart items | ✅ |
| 43 | Get cart summary | 50 RPS | Read | user_id, aggregates | Cart totals | Aggregate calculation | ✅ |
| 44 | Validate cart inventory | 100 RPS | Read | cart_items, inventory | Pre-checkout validation | Real-time inventory check | ✅ |
| 45 | Upgrade to seller | 0.1 RPS | Write | user_id, is_seller flag | Same as pattern 5 | Duplicate of AP5 | ✅ |
| 46 | Get seller profile | 0.1 RPS | Read | seller_id, profile data | Seller dashboard | Point lookup | ✅ |
| 47 | Get seller dashboard statistics | 0.1 RPS | Read | seller_id, aggregates | Complex dashboard | Pre-computed aggregates | ✅ |
| 48 | Update seller profile | 0.05 RPS | Write | seller_id, profile data | Low frequency | Profile update | ✅ |

## Entity Relationships Deep Dive
- **Users → Products**: 1:Many (sellers can have multiple products, avg 10 products per seller)
- **Users → Orders**: 1:Many (customers place multiple orders, avg 5 orders per user annually)
- **Users → CartItems**: 1:Many (each user has persistent cart, avg 3 items per cart)
- **Categories → Categories**: Self-referencing hierarchy (unlimited depth, currently 2 levels)
- **Categories → Products**: 1:Many (products belong to categories)
- **Orders → OrderItems**: 1:Many (orders contain multiple products, avg 3 items per order)
- **Products → OrderItems**: 1:Many (products appear in multiple orders)
- **Products → CartItems**: 1:Many (products can be in multiple carts)

## Design Considerations (Scratchpad - Subject to Change)
- **Hot Partition Concerns**: Pattern #11 (product details) at 200 RPS could create hot partitions for popular products - need distribution strategy
- **GSI Projections**: Consider KEYS_ONLY for cost optimization on search patterns, INCLUDE for frequently accessed attributes
- **Denormalization Ideas**: 
  - Duplicate category name in Product table (89.9% of queries join these)
  - Duplicate seller username in Product table (frequent access pattern)
  - Duplicate product name in OrderItems for historical preservation
- **Alternative Solutions**: 
  - Pattern #9 (product text search) needs ElasticSearch integration via DynamoDB Streams
  - Pattern #36 (order text search) needs similar ElasticSearch approach
  - Pattern #25 (category hierarchy) might need recursive queries or path denormalization
- **Streams/Lambda**: Consider for maintaining search indexes, inventory updates, order processing
- **Cost Optimization**: High read volume (840 QPS browsing) suggests on-demand pricing, consider DAX for hot products
- **Transaction Requirements**: Pattern #29 (checkout) needs ACID properties for inventory updates and order creation
- **Unique Constraints**: Username and email uniqueness requires lookup tables with TransactWriteItems
- **Real-time Inventory**: Patterns #16, #29, #37, #44 need consistent inventory data across operations

## Validation Checklist
- [x] Application domain and scale documented ✅
- [x] All entities and relationships mapped ✅
- [x] Every access pattern has RPS estimate ✅
- [x] Write pattern exists for every read pattern (and vice versa) unless USER explicitly declines ✅
- [x] Non-DynamoDB patterns identified with alternatives ✅
- [x] Hot partition risks evaluated ✅
- [x] Design considerations captured (subject to final validation) ✅
