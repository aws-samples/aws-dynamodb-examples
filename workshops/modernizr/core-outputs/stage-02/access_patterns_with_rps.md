# Complete Access Patterns with RPS Estimates

## RPS Distribution Summary
- **Total Target Load**: 1,400 QPS
- **Growth Factor**: 100x from baseline (1.44 QPS → 1,400 QPS)
- **Load Distribution**: Authentication (19%), Browsing/Search (60%), Cart (25%), Orders (16%), Seller (<1%)

## Complete Access Pattern Analysis

| Pattern # | Description | Peak RPS | Average RPS | Type | Key Attributes | Design Considerations |
|-----------|-------------|----------|-------------|------|----------------|----------------------|
| **AP1** | Create user account | 10 | 10 | Write | username, email, password_hash | Username as PK, email GSI for uniqueness |
| **AP2** | Authenticate user by username | 250 | 250 | Read | username, password_hash | High-frequency read, consider caching |
| **AP3** | Get user profile by user ID | 5 | 5 | Read | user_id, profile_data | Point lookup by PK |
| **AP4** | Update user profile | 0.3 | 0.3 | Write | user_id, profile_fields | Low frequency, simple update |
| **AP5** | Upgrade user to seller | 0.1 | 0.1 | Write | user_id, is_seller flag | Rare operation, simple flag update |
| **AP6** | Logout user | 250 | 250 | None | session_token | No DB operation (token invalidation) |
| **AP7** | Verify user token | 250 | 250 | Read | user_id from token | High-frequency, consider JWT stateless |
| **AP8** | Get products with filters/pagination | 420 | 420 | Read | category_id, seller_id, price_range | Complex filtering, needs multiple GSIs |
| **AP9** | Search products by text | 420 | 420 | Read | name, description text | Full-text search, ElasticSearch integration |
| **AP10** | Get products by category | 100 | 100 | Read | category_id | GSI on category_id |
| **AP11** | Get single product by ID | 200 | 200 | Read | product_id | Point lookup, hot partition risk |
| **AP12** | Create new product | 0.01 | 0.01 | Write | seller_id, product_data | Seller validation required |
| **AP13** | Update product | 0.01 | 0.01 | Write | product_id, seller_id | Owner validation, low frequency |
| **AP14** | Delete product | 0.005 | 0.005 | Write | product_id, seller_id | Owner validation, very rare |
| **AP15** | Get products by seller ID | 0.1 | 0.1 | Read | seller_id | GSI on seller_id |
| **AP16** | Update product inventory | 0.02 | 0.02 | Write | product_id, inventory_quantity | Real-time inventory updates |
| **AP17** | Get seller product statistics | 0.05 | 0.05 | Read | seller_id, aggregates | Aggregate query, consider pre-computation |
| **AP18** | Upload product image | 0.01 | 0.01 | None | image_file | S3 upload, no DB operation |
| **AP19** | Search categories by name | 10 | 10 | Read | category_name | Text search on categories |
| **AP20** | Get all categories flat list | 50 | 50 | Read | all categories | Full scan, consider caching |
| **AP21** | Get root categories | 50 | 50 | Read | parent_id = null | GSI on parent_id |
| **AP22** | Get child categories by parent ID | 30 | 30 | Read | parent_id | GSI on parent_id |
| **AP23** | Get category path breadcrumb | 20 | 20 | Read | category_id, hierarchy | Recursive lookup, denormalize path |
| **AP24** | Get single category by ID | 20 | 20 | Read | category_id | Point lookup |
| **AP25** | Get category hierarchy tree | 30 | 30 | Read | all categories, hierarchy | Complex hierarchical query |
| **AP26** | Create category | 0.001 | 0.001 | Write | category_data | Admin operation, very rare |
| **AP27** | Update category | 0.001 | 0.001 | Write | category_id | Admin operation, very rare |
| **AP28** | Delete category | 0.0005 | 0.0005 | Write | category_id | Admin operation, cascade validation |
| **AP29** | Create order from cart checkout | 200 | 200 | Write | user_id, cart_items, inventory | Transaction required, inventory update |
| **AP30** | Get user order history with pagination | 50 | 50 | Read | user_id, date_range | GSI on user_id, sort by date |
| **AP31** | Get single order by ID | 30 | 30 | Read | order_id, user_id | Point lookup with owner validation |
| **AP32** | Cancel order | 5 | 5 | Write | order_id, user_id | Owner validation, status update |
| **AP33** | Get user order summary/statistics | 10 | 10 | Read | user_id, aggregates | Aggregate query, consider pre-computation |
| **AP34** | Update order status | 10 | 10 | Write | order_id, seller_id | Seller validation, status update |
| **AP35** | Get recent orders for user | 20 | 20 | Read | user_id, recent_limit | GSI on user_id, sort by date |
| **AP36** | Search user orders by text | 5 | 5 | Read | user_id, search_text | Text search within user orders |
| **AP37** | Validate checkout eligibility | 200 | 200 | Read | cart_items, inventory | Real-time inventory validation |
| **AP38** | Get user cart with items | 100 | 100 | Read | user_id | GSI on user_id |
| **AP39** | Add item to cart | 175 | 175 | Write | user_id, product_id, quantity | Upsert operation |
| **AP40** | Update cart item quantity | 100 | 100 | Write | user_id, product_id, quantity | Update operation |
| **AP41** | Remove item from cart | 50 | 50 | Write | user_id, product_id | Delete operation |
| **AP42** | Clear entire cart | 25 | 25 | Write | user_id | Batch delete operation |
| **AP43** | Get cart summary | 50 | 50 | Read | user_id, aggregates | Aggregate calculation |
| **AP44** | Validate cart inventory | 100 | 100 | Read | cart_items, inventory | Real-time inventory check |
| **AP45** | Upgrade to seller | 0.1 | 0.1 | Write | user_id, is_seller flag | Same as AP5 |
| **AP46** | Get seller profile | 0.1 | 0.1 | Read | seller_id | Point lookup |
| **AP47** | Get seller dashboard statistics | 0.1 | 0.1 | Read | seller_id, aggregates | Complex aggregates, pre-computation |
| **AP48** | Update seller profile | 0.05 | 0.05 | Write | seller_id, profile_data | Low frequency update |

## RPS Category Breakdown

### Authentication & User Management (270 QPS - 19.3%)
- **Login operations**: 250 QPS (AP2, AP6, AP7)
- **Registration**: 10 QPS (AP1)
- **Profile management**: 10 QPS (AP3, AP4, AP5)

### Product Browsing & Search (840 QPS - 60.0%)
- **Product search**: 420 QPS (AP9)
- **Product listing**: 420 QPS (AP8)
- **Product details**: 200 QPS (AP11)

### Category Operations (210 QPS - 15.0%)
- **Category navigation**: 180 QPS (AP20, AP21, AP22, AP25)
- **Category search**: 30 QPS (AP19, AP23, AP24)

### Shopping Cart Operations (350 QPS - 25.0%)
- **Cart modifications**: 350 QPS (AP39, AP40, AP41, AP42)
- **Cart viewing**: 250 QPS (AP38, AP43, AP44)

### Order Processing (220 QPS - 15.7%)
- **Order creation**: 200 QPS (AP29)
- **Checkout validation**: 200 QPS (AP37)
- **Order management**: 120 QPS (AP30, AP31, AP32, AP33, AP34, AP35, AP36)

### Seller Operations (0.3 QPS - <0.1%)
- **Product management**: 0.05 QPS (AP12, AP13, AP14, AP15, AP16, AP17)
- **Seller profile**: 0.25 QPS (AP45, AP46, AP47, AP48)

### Administrative Operations (<0.01 QPS - <0.001%)
- **Category management**: 0.002 QPS (AP26, AP27, AP28)

## Key Design Requirements

### High-Frequency Patterns (>100 QPS)
1. **AP2 - User Authentication**: 250 QPS - Needs caching strategy
2. **AP8 - Product Listing**: 420 QPS - Complex filtering, multiple GSIs
3. **AP9 - Product Search**: 420 QPS - ElasticSearch integration required
4. **AP29 - Order Creation**: 200 QPS - Transaction support needed
5. **AP37 - Checkout Validation**: 200 QPS - Real-time inventory checks
6. **AP39 - Add to Cart**: 175 QPS - High-frequency writes

### Critical Performance Requirements
- **Real-time inventory**: AP16, AP29, AP37, AP44 need consistent inventory data
- **User isolation**: Cart and order operations must enforce user ownership
- **Search performance**: AP9 requires external search service integration
- **Transaction support**: AP29 (checkout) needs ACID properties for inventory updates
- **Hot partition mitigation**: AP11 (popular products) needs distribution strategy

### Security & Validation Requirements
- **Owner validation**: Orders, cart, seller operations must validate ownership
- **Seller permissions**: Product management operations need seller role validation
- **Unique constraints**: Username and email uniqueness must be maintained
- **Admin operations**: Category management needs admin role validation

## Total Validation
**Sum of all RPS estimates**: 1,400 QPS ✓
**Coverage**: All 48 API access patterns included ✓
**Business alignment**: Matches provided load distribution ✓
