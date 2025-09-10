# Frontend Navigation Guide 🧭

A comprehensive guide to using all features of the Online Shopping Store frontend application. This guide covers how to access and use each of the 48+ API endpoints through the user interface.

## 🚀 Getting Started

**Application URL:** `http://localhost:3000`  
**Prerequisites:** Backend API running at `http://localhost:8100`

---



## 🔐 Authentication & User Management

### 1. User Registration
**How to Access:** 
- Click "Sign Up" or "Register" button on the homepage
- Navigate to `/register`

**What You Can Do:**
- Create a new user account
- Provide username, email, password, first name, and last name
- Automatic login after successful registration

**API Used:** `POST /api/auth/register`

### 2. User Login
**How to Access:**
- Click "Login" or "Sign In" button
- Navigate to `/login`

**What You Can Do:**
- Login with username/email and password
- Access protected features after authentication
- Automatic redirect to intended page

**API Used:** `POST /api/auth/login`

### 3. User Profile Management
**How to Access:**
- Click on your username/avatar in the navigation bar
- Navigate to `/profile`
- **Requires:** User authentication

**What You Can Do:**
- View your profile information
- Update email, first name, and last name
- View account creation date and user ID

**APIs Used:** 
- `GET /api/auth/profile` - View profile
- `PUT /api/auth/profile` - Update profile

### 4. Upgrade to Seller Account
**How to Access:**
- Go to Profile page (`/profile`)
- Click "Upgrade to Seller" button
- Or navigate to `/upgrade-seller`
- **Requires:** User authentication

**What You Can Do:**
- Convert regular user account to seller account
- Gain access to seller dashboard and product management
- Start selling products on the platform

**API Used:** `POST /api/auth/upgrade-seller`

### 5. Logout
**How to Access:**
- Click "Logout" button in navigation bar
- Available when logged in

**What You Can Do:**
- Securely logout from the application
- Clear authentication tokens
- Redirect to homepage

**API Used:** `POST /api/auth/logout`

### 6. Token Verification
**How to Access:**
- Automatic - happens behind the scenes
- When accessing protected pages

**What You Can Do:**
- Automatic validation of login status
- Seamless authentication experience

**API Used:** `GET /api/auth/verify`

---

## 🛍️ Product Browsing & Discovery

### 7. Browse All Products
**How to Access:**
- Click "Products" in main navigation
- Navigate to `/products`
- **Public:** No authentication required

**What You Can Do:**
- View all available products with pagination
- See product images, names, prices, and descriptions
- Navigate through multiple pages of products
- Filter by availability (in stock only)

**API Used:** `GET /api/products`

### 8. Search Products
**How to Access:**
- Use search bar in the header
- Type product name or description keywords, hit enter.
- Results appear on `/products` page
- **Public:** No authentication required

**What You Can Do:**
- Search products by name and description
- Get paginated search results
- See search term highlighted in results

**API Used:** `GET /api/products/search`

### 9. View Product Details
**How to Access:**
- Click on any product card
- Navigate to `/products/:id`
- **Public:** No authentication required

**What You Can Do:**
- View detailed product information
- See full description, price, and inventory status
- View seller information
- Add product to cart (if logged in)

**API Used:** `GET /api/products/:id`

### 10. Browse Products by Category
**How to Access:**
- Click "Categories" in main navigation
- Click on any category name
- Navigate to `/products/category/:categoryId`
- **Public:** No authentication required

**What You Can Do:**
- View all products in a specific category
- See category-specific product listings
- Navigate through paginated category results

**API Used:** `GET /api/products/category/:categoryId`

### 11. Advanced Product Filtering
**How to Access:**
- Use filter sidebar on `/products` page
- Apply multiple filters simultaneously
- **Public:** No authentication required

**What You Can Do:**
- Filter by price range (min/max price)
- Filter by specific seller
- Filter by category
- Filter by stock availability
- Combine multiple filters

**API Used:** `GET /api/products` (with query parameters)

---

## 📂 Category Management

### 12. View All Categories
**How to Access:**
- Click "Categories" in main navigation
- Navigate to `/categories`
- **Public:** No authentication required

**What You Can Do:**
- View hierarchical category tree
- See parent and child categories
- Navigate to category-specific product listings

**API Used:** `GET /api/categories`

### 13. View Category Hierarchy (Flat List)
**How to Access:**
- Category dropdown menus
- Filter sidebars
- **Public:** No authentication required

**What You Can Do:**
- See all categories as a simple list
- Quick category selection for filtering

**API Used:** `GET /api/categories/flat`

### 14. View Root Categories
**How to Access:**
- Main category navigation
- Category overview pages
- **Public:** No authentication required

**What You Can Do:**
- Browse top-level categories
- Navigate to main product sections

**API Used:** `GET /api/categories/roots`

### 15. View Category Details
**How to Access:**
- Click on category name
- Navigate to `/categories/:id`
- **Public:** No authentication required

**What You Can Do:**
- View specific category information
- See category description and metadata

**API Used:** `GET /api/categories/:id`

### 16. View Category Path (Breadcrumbs)
**How to Access:**
- Automatic on category and product pages
- Breadcrumb navigation
- **Public:** No authentication required

**What You Can Do:**
- See navigation path from root to current category
- Click breadcrumbs to navigate up the hierarchy

**API Used:** `GET /api/categories/:id/path`

### 17. View Child Categories
**How to Access:**
- Category detail pages
- Expandable category trees
- **Public:** No authentication required

**What You Can Do:**
- Browse subcategories
- Navigate deeper into category hierarchy

**API Used:** `GET /api/categories/:id/children`

### 18. Search Categories
**How to Access:**
- Category search box
- Filter interfaces
- **Public:** No authentication required

**What You Can Do:**
- Find categories by name
- Quick category discovery

**API Used:** `GET /api/categories/search`

---

## 🛒 Shopping Cart Management

### 19. View Shopping Cart
**How to Access:**
- Click cart icon in navigation bar
- Navigate to `/cart`
- **Requires:** User authentication

**What You Can Do:**
- View all items in your cart
- See item details, quantities, and prices
- View total cart value
- Proceed to checkout

**API Used:** `GET /api/cart`

### 20. Add Items to Cart
**How to Access:**
- Click "Add to Cart" on product detail pages
- Specify quantity before adding
- **Requires:** User authentication

**What You Can Do:**
- Add products to your shopping cart
- Specify desired quantity
- Get confirmation of successful addition

**API Used:** `POST /api/cart/items`

### 21. Update Cart Item Quantity
**How to Access:**
- Use quantity controls in cart page
- Plus/minus buttons or direct input
- **Requires:** User authentication

**What You Can Do:**
- Increase or decrease item quantities
- Update cart totals automatically
- Remove items by setting quantity to 0

**API Used:** `PUT /api/cart/items/:productId`

### 22. Remove Items from Cart
**How to Access:**
- Click "Remove" button on cart items
- Set quantity to 0
- **Requires:** User authentication

**What You Can Do:**
- Remove specific items from cart
- Clean up unwanted items
- Update cart totals

**API Used:** `DELETE /api/cart/items/:productId`

### 23. Clear Entire Cart
**How to Access:**
- "Clear Cart" button on cart page
- Confirmation dialog for safety
- **Requires:** User authentication

**What You Can Do:**
- Remove all items from cart at once
- Start fresh with empty cart

**API Used:** `DELETE /api/cart`

### 24. View Cart Summary (Badge)
**How to Access:**
- Cart icon badge in navigation
- Automatic updates
- **Requires:** User authentication

**What You Can Do:**
- See item count in cart
- Quick cart status check
- Navigate to full cart view

**API Used:** `GET /api/cart/summary`

### 25. Validate Cart Before Checkout
**How to Access:**
- Automatic before checkout process
- "Validate Cart" button
- **Requires:** User authentication

**What You Can Do:**
- Check inventory availability
- Identify out-of-stock items
- Ensure cart is ready for checkout

**API Used:** `GET /api/cart/validate`

---

## 📦 Order Management

### 26. Checkout Process
**How to Access:**
- Click "Checkout" button in cart
- Navigate to `/checkout`
- **Requires:** User authentication and items in cart

**What You Can Do:**
- Complete purchase of cart items
- Provide shipping and payment information
- Create order and process payment
- Receive order confirmation

**API Used:** `POST /api/orders/checkout`

### 27. View Order History
**How to Access:**
- Click "My Orders" in user menu
- Navigate to `/orders`
- **Requires:** User authentication

**What You Can Do:**
- View all your past orders
- See order status and details
- Navigate through paginated order history
- Track order progress

**API Used:** `GET /api/orders`

### 28. View Order Details
**How to Access:**
- Click on any order in order history
- Navigate to `/orders/:orderId`
- **Requires:** User authentication and order ownership

**What You Can Do:**
- View detailed order information
- See all items in the order
- Check order status and tracking
- View payment and shipping details

**API Used:** `GET /api/orders/:orderId`

### 29. Cancel Order (API available but - Not implemented in the front end)
**How to Access:**
- "Cancel Order" button on order detail page
- Only available for pending orders
- **Requires:** User authentication and order ownership

**What You Can Do:**
- Cancel pending orders
- Get refund for cancelled orders
- Update order status

**API Used:** `PUT /api/orders/:orderId/cancel`

### 30. View Order Summary/Statistics
**How to Access:**
- User dashboard or profile page
- Order statistics section
- **Requires:** User authentication

**What You Can Do:**
- See total orders placed
- View spending statistics
- Check order status distribution

**API Used:** `GET /api/orders/user/summary`

### 31. View Recent Orders
**How to Access:**
- Dashboard quick view
- "Recent Orders" section
- **Requires:** User authentication

**What You Can Do:**
- See your most recent orders
- Quick access to recent purchases
- Fast reordering options

**API Used:** `GET /api/orders/user/recent`

### 32. Search Your Orders
**How to Access:**
- Search box on order history page
- Filter by product name or order details
- **Requires:** User authentication

**What You Can Do:**
- Find specific orders quickly
- Search by product name or order ID
- Filter order history

**API Used:** `GET /api/orders/user/search`

### 33. Validate Checkout Eligibility
**How to Access:**
- Automatic before showing checkout button
- Pre-checkout validation
- **Requires:** User authentication

**What You Can Do:**
- Ensure cart is ready for checkout
- Check inventory and user eligibility
- Prevent checkout issues

**API Used:** `GET /api/orders/checkout/validate`

---

## 🏪 Seller Dashboard & Management

### 34. Access Seller Dashboard
**How to Access:**
- Click "Seller Dashboard" in navigation (sellers only)
- Navigate to `/seller/dashboard`
- **Requires:** Seller account authentication

**What You Can Do:**
- View seller overview and statistics
- Access seller-specific features
- Monitor business performance

**API Used:** `GET /api/seller/dashboard`

### 35. View Seller Profile
**How to Access:**
- Seller dashboard profile section
- Navigate to `/seller/profile`
- **Requires:** Seller account authentication

**What You Can Do:**
- View seller account information
- See seller-specific details
- Access profile management

**API Used:** `GET /api/seller/profile`

### 36. Update Seller Profile
**How to Access:**
- Edit profile button in seller dashboard
- Profile settings page
- **Requires:** Seller account authentication

**What You Can Do:**
- Update seller contact information
- Modify business details
- Change profile settings

**API Used:** `PUT /api/seller/profile`

### 37. Create New Product
**How to Access:**
- "Add Product" button in seller dashboard
- Navigate to `/seller/products/create`
- **Requires:** Seller account authentication

**What You Can Do:**
- Add new products to your inventory
- Set product details, pricing, and images
- Assign products to categories
- Set inventory quantities

**API Used:** `POST /api/products`

### 38. View My Products
**How to Access:**
- "My Products" section in seller dashboard
- Navigate to `/seller/products`
- **Requires:** Seller account authentication

**What You Can Do:**
- View all your listed products
- See product performance and status
- Access product management tools
- Navigate through paginated product list

**API Used:** `GET /api/products/seller/my-products`

### 39. Edit Product Details
**How to Access:**
- "Edit" button on product cards in seller dashboard
- Navigate to `/seller/products/:id/edit`
- **Requires:** Seller account authentication and product ownership

**What You Can Do:**
- Update product information
- Change pricing and descriptions
- Modify product categories
- Update product images

**API Used:** `PUT /api/products/:id`

### 40. Delete Products
**How to Access:**
- "Delete" button on product management page
- Confirmation dialog for safety
- **Requires:** Seller account authentication and product ownership

**What You Can Do:**
- Remove products from your inventory
- Clean up discontinued items
- Manage product lifecycle

**API Used:** `DELETE /api/products/:id`

### 41. Update Product Inventory
**How to Access:**
- Inventory management section
- Quick inventory update buttons
- **Requires:** Seller account authentication and product ownership

**What You Can Do:**
- Update stock quantities
- Mark products as in/out of stock
- Manage inventory levels

**API Used:** `PUT /api/products/:id/inventory`

### 42. View Seller Statistics
**How to Access:**
- Statistics dashboard in seller area
- Analytics section
- **Requires:** Seller account authentication

**What You Can Do:**
- View product performance metrics
- See sales statistics
- Monitor business growth

**API Used:** `GET /api/products/seller/stats`

### 43. Upload Product Images
**How to Access:**
- Image upload section in product creation/editing
- Drag-and-drop or file picker
- **Requires:** Seller account authentication

**What You Can Do:**
- Upload product photos
- Manage product image gallery
- Optimize product presentation

**API Used:** `POST /api/products/upload-image`

### 44. Manage Category Creation
**How to Access:**
- Category management in seller dashboard
- "Create Category" button
- **Requires:** Seller account authentication

**What You Can Do:**
- Create new product categories
- Organize product hierarchy
- Improve product discoverability

**API Used:** `POST /api/categories`

### 45. Update Categories
**How to Access:**
- Category management interface
- Edit buttons on category listings
- **Requires:** Seller account authentication

**What You Can Do:**
- Modify category names and descriptions
- Reorganize category hierarchy
- Update category relationships

**API Used:** `PUT /api/categories/:id`

### 46. Delete Categories
**How to Access:**
- Category management interface
- Delete buttons with confirmation
- **Requires:** Seller account authentication

**What You Can Do:**
- Remove unused categories
- Clean up category structure
- Manage category lifecycle

**API Used:** `DELETE /api/categories/:id`

### 47. Update Order Status (Seller) (API available but - Not implemented in the front end)
**How to Access:**
- Order management section in seller dashboard
- Order detail pages for seller's products
- **Requires:** Seller account authentication and order involvement

**What You Can Do:**
- Update order fulfillment status
- Mark orders as shipped or delivered
- Communicate order progress to customers

**API Used:** `PUT /api/orders/:orderId/status`

---

## 🏥 System & Health Monitoring

### 48. System Health Check
**How to Access:**
- Automatic - used by the application
- Developer tools or direct API access
- **Public:** No authentication required

**What You Can Do:**
- Monitor application health
- Check database connectivity
- View system performance metrics
- Troubleshoot issues

**API Used:** `GET /api/health`

---

## 🎯 Navigation Tips & Best Practices

### Quick Access Patterns

**For Regular Users:**
1. **Homepage** → Browse products → Add to cart → Checkout
2. **Search** → Filter results → View details → Purchase
3. **Categories** → Browse by category → Compare products → Buy

**For Sellers:**
1. **Upgrade Account** → Access seller dashboard → Create products
2. **Manage Inventory** → Update stock → Monitor sales
3. **Process Orders** → Update status → Track performance

### Mobile Navigation
- Responsive design works on all devices
- Touch-friendly buttons and controls
- Optimized mobile checkout process

### Keyboard Shortcuts
- **Tab** - Navigate through interactive elements
- **Enter** - Activate buttons and links
- **Escape** - Close modals and dialogs

### Accessibility Features
- Screen reader compatible
- High contrast mode support
- Keyboard navigation support
- Alt text for images

---

## 🔧 Troubleshooting Common Issues

### Authentication Issues
- **Problem:** Can't login
- **Solution:** Check credentials, ensure backend is running
- **Check:** Network tab in browser dev tools

### Cart Issues
- **Problem:** Items not adding to cart
- **Solution:** Ensure you're logged in, check product availability
- **Check:** Cart validation endpoint

### Checkout Problems
- **Problem:** Checkout fails
- **Solution:** Validate cart, check inventory, verify payment info
- **Check:** Checkout validation endpoint

### Seller Features Not Available
- **Problem:** Can't access seller features
- **Solution:** Upgrade to seller account first
- **Check:** User profile shows `is_seller: true`

---

## 📱 Mobile App Features

All features are available on mobile devices with responsive design:
- Touch-optimized interface
- Mobile-friendly navigation
- Optimized image loading
- Fast mobile checkout

---

## 🚀 Performance Tips

- **Fast Loading:** Products load with pagination
- **Search Optimization:** Use specific search terms
- **Image Loading:** Images are optimized for web
- **Caching:** Frequently accessed data is cached

---

This navigation guide covers all 48+ API endpoints available through the frontend interface. Each feature is designed to provide a seamless user experience while leveraging the full power of the backend API.

For technical implementation details, see the [Frontend README](./README.md) and [Backend API Documentation](../backend/README.md).