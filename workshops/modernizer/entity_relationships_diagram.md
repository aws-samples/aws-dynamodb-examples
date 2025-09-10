# Entity Relationship Diagram - Modernizer E-commerce Platform

This diagram shows the entity relationships for the DynamoDB design based on the API access patterns analysis.

```mermaid
erDiagram
    USERS {
        string id PK
        string username UK "Unique"
        string email UK "Unique"
        string password_hash
        string first_name
        string last_name
        boolean is_seller
        datetime created_at
        datetime updated_at
    }

    CATEGORIES {
        string id PK
        string name
        string description
        string parent_id FK "Self-referencing"
        datetime created_at
        datetime updated_at
    }

    PRODUCTS {
        string id PK
        string name
        string description
        decimal price
        integer stock_quantity
        string category_id FK
        string seller_id FK
        string image_url
        datetime created_at
        datetime updated_at
    }

    ORDERS {
        string id PK
        string user_id FK
        string status
        decimal total_amount
        datetime order_date
        datetime updated_at
        string shipping_address
    }

    ORDER_ITEMS {
        string order_id PK,FK
        string product_id PK,FK
        integer quantity
        decimal unit_price
        decimal total_price
    }

    CART_ITEMS {
        string user_id PK,FK
        string product_id PK,FK
        integer quantity
        datetime added_at
        datetime updated_at
    }

    %% User Relationships
    USERS ||--o{ PRODUCTS : "sells (as seller)"
    USERS ||--o{ ORDERS : "places (as customer)"
    USERS ||--o{ CART_ITEMS : "has items in cart"

    %% Category Relationships
    CATEGORIES ||--o{ PRODUCTS : "contains"
    CATEGORIES ||--o{ CATEGORIES : "parent-child hierarchy"

    %% Product Relationships
    PRODUCTS ||--o{ ORDER_ITEMS : "ordered in"
    PRODUCTS ||--o{ CART_ITEMS : "added to cart"

    %% Order Relationships
    ORDERS ||--o{ ORDER_ITEMS : "contains items"
```

## Key Relationship Notes:

### **One-to-Many Relationships:**
- **Users → Products**: A seller (user) can have many products
- **Users → Orders**: A customer (user) can have many orders  
- **Users → Cart Items**: A user can have many items in their cart
- **Categories → Products**: A category can contain many products
- **Products → Order Items**: A product can appear in many order items
- **Products → Cart Items**: A product can be in many users' carts
- **Orders → Order Items**: An order can contain many order items

### **Self-Referencing Relationship:**
- **Categories → Categories**: Categories form a hierarchical tree structure where each category can have a parent category

### **Composite Primary Keys:**
- **Order Items**: `(order_id, product_id)` - Links orders to products with quantities
- **Cart Items**: `(user_id, product_id)` - Links users to products in their shopping cart

### **Unique Constraints:**
- **Users**: `username` and `email` must be unique across all users

This entity model supports all 48 access patterns identified in the API analysis, including:
- User authentication and profile management
- Product catalog browsing and management
- Category hierarchy navigation
- Order processing and history
- Shopping cart operations
- Seller-specific functionality

The relationships enable efficient querying for complex operations like:
- Product searches with category filtering
- User order history with item details
- Seller product management
- Cart validation and checkout processing
- Category breadcrumb navigation
