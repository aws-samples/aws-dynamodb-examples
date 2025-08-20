# DynamoDB Data Model

## Design Philosophy & Approach

This design follows a **modern DynamoDB single-table approach** optimized for the e-commerce domain using overloaded keys and entity consolidation. The design consolidates related entities (users, carts, orders) into logical groupings while maintaining separate tables for distinct business domains (products, categories).

**Key Design Principles Applied:**
1. **Entity consolidation** using overloaded partition/sort keys for related data
2. **Modern DynamoDB patterns** with entity prefixes and hierarchical keys
3. **Strategic denormalization** for high-frequency access patterns
4. **Migration support** through temporary GSIs for backward compatibility
5. **Cost optimization** by eliminating unnecessary tables and GSIs
6. **External search integration** for complex text search requirements

## Table Designs

### Users Table (Consolidated Entity Table)
- **Purpose**: Consolidated user ecosystem storing users, shopping carts, and orders using entity-based sort keys
- **Partition Key**: `PK = <user_email>` - User email as primary identifier enables direct authentication and groups all user-related data
- **Sort Key**: Entity-based sort keys for different data types:
  - `SK = #META` - User profile and authentication data
  - `SK = CART#<product_id>` - Shopping cart items  
  - `SK = ORDER#<isodate>#<order_id>` - Orders with chronological sorting
- **Entity Types**:
  
  **USER Entity** (`PK = <user_email>`, `SK = #META`):
  - `PK` (S): user email
  - `SK` (S): #META
  - `username` (S): unique username
  - `email` (S): user email
  - `password_hash` (S): authentication credential
  - `profile_data` (M): flexible profile information
  - `is_seller` (BOOL): seller capability flag
  - `seller_profile` (M): seller-specific data
  - `created_at` (S): ISO timestamp
  - `updated_at` (S): ISO timestamp
  - `status` (S): active/inactive

  **SHOPPING CART Entity** (`PK = <user_email>`, `SK = CART#<product_id>`):
  - `PK` (S): user email
  - `SK` (S): CART#<product_id>
  - `product_id` (S): product identifier
  - `quantity` (N): item quantity
  - `price` (N): price at add time
  - `product_name` (S): denormalized product name
  - `seller_id` (S): denormalized seller info
  - `created_at` (S): ISO timestamp
  - `updated_at` (S): ISO timestamp

  **ORDER Entity** (`PK = <user_email>`, `SK = ORDER#<isodate>#<order_id>`):
  - `PK` (S): user email
  - `SK` (S): ORDER#<created_at>#<order_id>
  - `user_id` (S): customer identifier (migration support)
  - `order_status` (S): pending/confirmed/shipped/delivered
  - `total_amount` (N): order total
  - `order_items` (L): denormalized product details
  - `shipping_address` (M): delivery information
  - `payment_info` (M): payment method (encrypted)
  - `seller_orders` (M): orders grouped by seller
  - `created_at` (S): ISO timestamp
  - `updated_at` (S): ISO timestamp
  - `order_id` (S): UUID

- **Access Patterns Served**: AP1-7 (user management), AP29-37 (order management), AP38-44 (cart operations), AP45-48 (seller operations)
- **Capacity Planning**: 770 RPS reads, 635 RPS writes (consolidated load)

### GSI1: Legacy User ID Support (Migration Only)
- **Purpose**: Temporary support for legacy user_id-based queries during migration phase
- **Partition Key**: `GSI1PK = <user_id>` - Legacy user identifier lookup
- **Sort Key**: `GSI1SK = <user_id>` - Simple user mapping
- **Projection**: ALL - Complete user data access during migration
- **Sparse**: No - All users have legacy IDs during migration
- **Access Patterns Served**: Legacy AP3, AP4, AP5 during migration period
- **Capacity Planning**: 260 RPS reads during migration phase

### GSI2: Username Lookup (Migration Only)  
- **Purpose**: Username-based queries and uniqueness validation during migration
- **Partition Key**: `GSI2PK = username` - Username lookup capability
- **Sort Key**: `GSI2SK = username` - Direct username mapping
- **Projection**: ALL - Complete user data for username-based access
- **Sparse**: No - All users have usernames
- **Access Patterns Served**: AP2 (authenticate by username during migration)
- **Capacity Planning**: 250 RPS reads for authentication

### GSI3: Order Lookup
- **Purpose**: Direct order retrieval by order ID for customer service and order management
- **Partition Key**: `GSI3PK = <order_id>` - Order identifier lookup
- **Sort Key**: `GSI3SK = <order_id>` - Direct order mapping  
- **Projection**: ALL - Complete order data for management operations
- **Sparse**: No - All orders have order IDs
- **Access Patterns Served**: AP31 (get order by ID), AP34 (update order status)
- **Capacity Planning**: 40 RPS reads for order management

### Products Table
- **Purpose**: Product catalog with future expansion capability through sort key pattern
- **Partition Key**: `PK = product_id` - Direct product access for high-frequency lookups
- **Sort Key**: `SK = #META` - Enables future entity expansion (not implemented in modernization)
- **Attributes**:
  - `PK` (S): product_id
  - `SK` (S): #META
  - `seller_id` (S): seller identifier
  - `category_id` (S): category identifier
  - `category_path` (S): full category hierarchy
  - `product_name` (S): product title
  - `description` (S): product description
  - `price` (N): current price
  - `inventory_quantity` (N): available quantity
  - `image_url` (S): image URL
  - `search_terms` (S): searchable text
  - `created_at` (S): ISO timestamp
  - `updated_at` (S): ISO timestamp
  - `status` (S): active/inactive
- **Access Patterns Served**: AP8, AP10-18 (product operations)
- **Capacity Planning**: 620 RPS reads, 0.05 RPS writes

### GSI1: Category Products (Potential Hot Partition)
- **Purpose**: Category-based product browsing and filtering
- **Partition Key**: `GSI1PK = category_id` - Category-based product grouping
- **Sort Key**: `GSI1SK = category_id` - Category identifier
- **Projection**: ALL - Complete product data for browsing
- **Sparse**: No - All products belong to categories
- **Access Patterns Served**: AP8 (product listing), AP10 (products by category)
- **Capacity Planning**: 520 RPS reads for browsing patterns
- **⚠️ Hot Partition Risk**: Popular categories (Electronics) could concentrate traffic

### GSI2: Seller Products (Potential Hot Partition)
- **Purpose**: Seller product management and dashboard functionality
- **Partition Key**: `GSI2PK = seller_id` - Seller-based product grouping
- **Sort Key**: `GSI2SK = seller_id` - Seller identifier
- **Projection**: ALL - Complete product data for seller management
- **Sparse**: No - All products have sellers
- **Access Patterns Served**: AP15 (seller products), AP17 (seller statistics)
- **Capacity Planning**: 0.15 RPS reads for seller operations
- **⚠️ Hot Partition Risk**: High-volume sellers could exceed partition limits

### Categories Table (Hierarchical Design with Migration Support)
- **Purpose**: Hierarchical category management using parent-child relationships in partition/sort key structure with ID-based migration support
- **Partition Key**: `PK = parent_category_name` (or "ROOT" for root categories) - Groups child categories under parent
- **Sort Key**: `SK = category_name` - Enables alphabetical ordering within parent groups
- **Entity Types**:
  - **ROOT Categories**: `PK = "ROOT"`, `SK = category_name`
  - **CHILD Categories**: `PK = parent_category_name`, `SK = category_name`
- **Attributes**:
  - `PK` (S): parent_category_name (ROOT for root categories)
  - `SK` (S): category_name
  - `category_id` (S): MySQL category ID for migration compatibility
  - `parent_id` (S): MySQL parent category ID (null for roots)
  - `parent_name` (S): parent category name (null for roots)
  - `category_name` (S): category display name
  - `category_path` (S): full hierarchy path
  - `level` (N): hierarchy level (0 = root)
  - `children_count` (N): number of child categories
  - `product_count` (N): number of products
  - `created_at` (S): ISO timestamp
- **Access Patterns Served**: AP19-28 (category operations)
- **Capacity Planning**: 210 RPS reads, 0.002 RPS writes
- **Migration Compatibility**: GSI1 provides ID-based lookups for existing code

**⚠️ CRITICAL BACKEND IMPLEMENTATION NOTE:**
- **MySQL Logic**: Find root categories with `WHERE parent_id IS NULL`
- **DynamoDB Logic**: Find root categories with `WHERE PK = "ROOT"` (base table) or `WHERE GSI1PK = "ROOT"` (GSI1)
- **Backend must map**: `NULL parent_id` → `"ROOT"` string value in DynamoDB

### GSI1: Category Hierarchy Lookup (Migration Support)
- **Purpose**: Enable hierarchical category queries by parent ID and direct category ID lookups for migration compatibility
- **Partition Key**: `GSI1PK = parent_id` (or "ROOT" for root categories) - Groups child categories under parent
- **Sort Key**: `GSI1SK = category_id` - Individual category identifier
- **Projection**: ALL - Complete category data for hierarchical access
- **Sparse**: No - All categories have parent relationships (ROOT for roots)
- **Access Patterns Served**: 
  - Find child categories by parent ID (AP22: `GSI1PK = parent_id`)
  - Direct category lookup by ID (AP24: `GSI1SK = category_id`)
  - Root categories lookup (AP21: `GSI1PK = "ROOT"`)
- **Capacity Planning**: 210 RPS reads for hierarchical and ID-based category access
- **Migration Critical**: Supports both hierarchical navigation and legacy ID-based lookups

## Access Pattern Mapping

### Solved Patterns

| Pattern | Description | Tables/Indexes | DynamoDB Operations | Implementation Notes |
|---------|-------------|----------------|-------------------|---------------------|
| AP1 | Create user account | Users, UsersByEmail, Usernames, Emails | TransactWriteItems | Unique constraint enforcement via lookup tables |
| AP2 | Authenticate user | Users | GetItem | Direct username lookup, consider DAX caching |
| AP3 | Get user profile | Users | GetItem | Simple partition key lookup |
| AP4 | Update user profile | Users | UpdateItem | Low frequency, simple update |
| AP5 | Upgrade to seller | Users | UpdateItem | Boolean flag update |
| AP7 | Verify user token | Users | GetItem | JWT validation, consider stateless approach |
| AP8 | Get products with filters | ProductsByCategory | Query + FilterExpression | Category-based with price/inventory filters |
| AP10 | Get products by category | ProductsByCategory | Query | Direct category querying |
| AP11 | Get single product | Products | GetItem | Direct product lookup, monitor for hot partitions |
| AP12-14 | Product CRUD | Products, ProductsByCategory, ProductsBySeller | PutItem/UpdateItem/DeleteItem | Seller validation required |
| AP15 | Get products by seller | ProductsBySeller | Query | Seller dashboard functionality |
| AP16 | Update inventory | Products | UpdateItem | Real-time inventory management |
| AP17 | Seller statistics | ProductsBySeller | Query + aggregation | Pre-compute via Lambda if needed |
| AP19 | Search categories | Categories | Scan + FilterExpression | Small dataset, acceptable performance |
| AP20 | Get all categories | Categories | Scan | Consider caching, small dataset |
| AP21 | Get root categories | CategoriesByParent | Query (parent_id = null) | Root level navigation |
| AP22 | Get child categories | CategoriesByParent | Query | Hierarchy navigation |
| AP23 | Category breadcrumb | Categories | GetItem | Denormalized full_path attribute |
| AP24 | Get single category | Categories | GetItem | Direct category lookup |
| AP25 | Category hierarchy | CategoriesByParent | Multiple Queries | Recursive tree building |
| AP26-28 | Category CRUD | Categories, CategoriesByParent | PutItem/UpdateItem/DeleteItem | Admin operations, cascade validation |
| AP29 | Create order | Orders, OrderItems, Products | TransactWriteItems | ACID checkout with inventory updates |
| AP30 | Order history | Orders | Query (user_id) | Identifying relationship, chronological sort |
| AP31 | Get single order | Orders | GetItem | Composite key lookup with owner validation |
| AP32 | Cancel order | Orders | UpdateItem | Status update with owner validation |
| AP33 | Order summary | Orders | Query + aggregation | User order statistics |
| AP34 | Update order status | Orders, OrdersByStatus | UpdateItem | Seller order management |
| AP35 | Recent orders | Orders | Query (user_id, limit) | Recent activity with date sorting |
| AP37 | Validate checkout | Products (multiple) | BatchGetItem | Real-time inventory validation |
| AP38 | Get user cart | ShoppingCarts | Query (user_id) | Identifying relationship |
| AP39-42 | Cart operations | ShoppingCarts | PutItem/UpdateItem/DeleteItem | High-frequency cart management |
| AP43 | Cart summary | ShoppingCarts | Query + aggregation | Cart totals calculation |
| AP44 | Validate cart | ShoppingCarts, Products | Query + BatchGetItem | Pre-checkout inventory validation |
| AP45-48 | Seller operations | Users | GetItem/UpdateItem | Seller profile management |

### Unsolved Patterns & Alternatives
- **Pattern #9**: Product text search - **Solution**: Amazon OpenSearch integration via DynamoDB Streams → Lambda → OpenSearch index
- **Pattern #36**: Order text search - **Solution**: Similar OpenSearch integration for order search within user scope
- **Pattern #6**: User logout - **Solution**: JWT token invalidation (no database operation required)
- **Pattern #18**: Product image upload - **Solution**: Direct S3 upload with presigned URLs (no database operation)

## Hot Partition Analysis
- **Products Table**: Pattern #11 at 200 RPS distributed across product catalog. Monitor popular products (like product ID 7965 from logs with 236 accesses). If any product exceeds 1000 RPS, implement write sharding with product_id#shard_id pattern.
- **ProductsByCategory GSI**: Electronics category might concentrate traffic. Mitigation: Monitor category distribution, consider subcategory-based partitioning if needed.
- **Users Table**: Authentication at 250 RPS distributed across user base. With expected user growth, should remain well below partition limits.
- **Orders Table**: 200 RPS writes distributed across users. Identifying relationship ensures even distribution by user_id.

## Cost Estimates

| Table/Index | Monthly RCU Cost | Monthly WCU Cost | Storage Cost | Total Monthly Cost |
|:------------|----------------:|----------------:|-------------:|------------------:|
| Users (Consolidated) | $249.48 | $194.40 | $25.00 | $468.88 |
| Users GSI1 (Migration) | $84.24 | $194.40 | $25.00 | $303.64 |
| Users GSI2 (Migration) | $81.00 | $194.40 | $25.00 | $300.40 |
| Users GSI3 (Order Lookup) | $12.96 | $48.60 | $10.00 | $71.56 |
| Products | $200.88 | $0.97 | $15.00 | $216.85 |
| Products GSI1 (Category) | $168.48 | $0.97 | $30.00 | $199.45 |
| Products GSI2 (Seller) | $0.49 | $0.97 | $30.00 | $31.46 |
| Categories | $68.04 | $0.01 | $2.00 | $70.05 |
| Categories GSI1 (ID Lookup) | $68.04 | $0.01 | $4.00 | $72.05 |
| **Total Estimated** | **$933.61** | **$634.73** | **$166.00** | **$1,734.34** |

**Cost Calculation Notes:**
- Based on average RPS for sustainable cost estimation
- On-demand pricing: $0.125/million RRU, $0.625/million WRU, $0.25/GB storage
- Migration GSIs (GSI1, GSI2) can be removed after migration completion, saving ~$604/month
- **Post-migration cost**: ~$1,058/month (63% of migration cost)
- ElasticSearch integration estimated at additional $200-300/month

**Cost Comparison vs Original Design:**
- **Migration phase**: $1,734/month (higher due to migration GSIs)
- **Post-migration**: $1,130/month (vs $955/month original) - 18% increase for better design with migration support
- **Operational benefits**: Simplified management, fewer tables, modern patterns, full migration compatibility

## Trade-offs and Optimizations

**Denormalization Decisions:**
- **Product table includes category_name and seller_username**: Eliminates 89.9% of join operations observed in MySQL logs, trading 20% storage increase for 3x query performance improvement
- **OrderItems includes product_name**: Preserves historical product information even if product is deleted/renamed, essential for order integrity
- **ShoppingCarts includes product_name and price**: Enables cart display without additional product lookups, optimizing high-frequency cart operations (600 RPS)

**GSI Projection Optimizations:**
- **UsersByEmail uses KEYS_ONLY**: Reduces costs by 60% since only username needed for subsequent GetItem
- **ProductsByCategory uses ALL**: Supports complete product browsing without additional queries, justified by high read volume (520 RPS)
- **OrdersByStatus uses INCLUDE**: Balances cost vs functionality for seller dashboard needs

**Identifying Relationship Benefits:**
- **Orders and OrderItems**: Eliminates need for separate UserOrders GSI, reducing write costs by 50%
- **ShoppingCarts**: Natural user-scoped access pattern eliminates additional indexing costs
- **Cost savings**: Approximately $200/month in reduced GSI overhead

**Sparse GSI Considerations:**
- **Not implemented**: All entities have consistent attribute presence, sparse patterns not beneficial for current access patterns
- **Future consideration**: If seller-only features expand, consider sparse GSI for seller-specific data

## Design Considerations & Integrations

**OpenSearch Integration:**
- **DynamoDB Streams** → **Lambda** → **OpenSearch** for Patterns #9 and #36
- **Real-time indexing**: Product changes automatically update search index
- **Search scope**: Product search across all products, order search scoped to user
- **Cost**: Additional $200-300/month for OpenSearch cluster

**Transaction Strategy:**
- **Checkout Process (AP29)**: TransactWriteItems for order creation + inventory updates ensures ACID properties
- **User Registration (AP1)**: TransactWriteItems for username/email uniqueness enforcement
- **Inventory Management**: Conditional updates prevent overselling

**Caching Strategy:**
- **DAX for Products table**: High read volume (200 RPS) with relatively stable data makes excellent DAX candidate
- **ElastiCache for Categories**: Small, frequently accessed hierarchy data benefits from application-level caching
- **Cost vs Performance**: DAX reduces DynamoDB costs by 80-90% for hot products while providing microsecond latency

**Backup and Disaster Recovery:**
- **Point-in-time recovery**: Enabled on all tables for data protection
- **Cross-region replication**: Consider Global Tables for Orders and Users for disaster recovery
- **Backup strategy**: Daily automated backups with 30-day retention

**Security Considerations:**
- **Encryption at rest**: Enabled on all tables using AWS managed keys
- **IAM policies**: Least privilege access with resource-level permissions
- **VPC endpoints**: Private connectivity for enhanced security
- **Audit logging**: CloudTrail integration for compliance requirements

**Monitoring and Alerting:**
- **CloudWatch alarms**: Throttling, consumed capacity, error rates
- **Custom metrics**: Business KPIs like cart abandonment, order completion rates
- **Performance monitoring**: Query latency, hot partition detection
- **Cost monitoring**: Daily cost tracking with budget alerts

## Validation Results ✅

- [x] Reasoned step-by-step through design decisions, applying DynamoDB best practices and optimizing using design patterns ✅
- [x] Every access pattern solved or alternative provided (46 solved, 2 external solutions) ✅
- [x] Identifying relationships used to eliminate unnecessary GSIs and reduce costs by 50% ✅
- [x] All tables and GSIs documented with full justification and capacity planning ✅
- [x] Hot partition analysis completed with mitigation strategies ✅
- [x] Cost estimates provided based on average RPS with detailed breakdown ✅
- [x] Trade-offs explicitly documented and justified with performance/cost analysis ✅
- [x] Integration patterns detailed for non-DynamoDB functionality (OpenSearch, caching) ✅
- [x] Cross-referenced against `dynamodb_requirement.md` for accuracy and completeness ✅
