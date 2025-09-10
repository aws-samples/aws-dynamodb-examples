# Frontend Application 🎨

Modern React/TypeScript e-commerce frontend with responsive design, comprehensive state management, and robust testing. Built with React 19, Tailwind CSS, and TypeScript for a seamless shopping experience.

## 🚀 Quick Start

```bash
cd frontend
npm install
npm start       # Development server at http://localhost:3000
```

**Note:** Requires backend API running at `http://localhost:8100` for full functionality.

## 🔧 Configuration

### Environment Variables

Create `.env` file in the frontend directory:

```env
# Backend API Configuration
REACT_APP_API_URL=http://localhost:8100

# Development Server (optional)
PORT=3000
```

### Available Scripts

```bash
npm start           # Development server with hot reload
npm run build       # Production build
npm test           # Run test suite
npm run clean      # Clean build artifacts
npm run security:check  # Security audit
```

For a detailed description of all the features please refer to [NAVIGATION.md](./NAVIGATION.md)

## 🎯 Key Features

### 🛒 E-commerce Functionality
- **User Authentication** - Login, registration, profile management
- **Product Catalog** - Browse, search, filter with pagination
- **Shopping Cart** - Add/remove items, quantity management
- **Order Management** - Checkout, order history, tracking
- **Seller Dashboard** - Product management for sellers

### 🎨 User Experience
- **Responsive Design** - Mobile-first with Tailwind CSS
- **Type Safety** - Full TypeScript implementation
- **State Management** - React Context API for global state
- **Error Handling** - Comprehensive error boundaries
- **Performance** - Code splitting and lazy loading

## 📁 Frontend Architecture

```
frontend/src/
├── 🧩 components/          # Reusable UI Components
│   ├── CategoryFilter.tsx     # Product category filtering
│   ├── ErrorBoundary.tsx      # Error handling wrapper
│   ├── Layout.tsx             # Main application layout
│   ├── ProductCard.tsx        # Product display card
│   ├── ProtectedRoute.tsx     # Authentication guard
│   ├── SearchBar.tsx          # Product search functionality
│   └── ...                    # Other UI components
│
├── 🔄 contexts/            # Global State Management
│   ├── AuthContext.tsx        # User authentication state
│   └── CartContext.tsx        # Shopping cart state
│
├── 📄 pages/               # Route-based Page Components
│   ├── HomePage.tsx           # Landing page
│   ├── ProductsPage.tsx       # Product catalog
│   ├── CartPage.tsx           # Shopping cart
│   ├── CheckoutPage.tsx       # Order checkout
│   ├── SellerDashboardPage.tsx # Seller management
│   └── ...                    # Other pages
│
├── 🔌 services/            # API Integration Layer
├── 🛠️ utils/               # Utility functions
├── 🧪 tests/               # Test files
├── 🚀 App.tsx              # Main application component
└── 📍 index.tsx            # Application entry point

Static Assets:
├── 📁 public/              # Static files (images, icons, etc.)
└── 📦 build/               # Production build output (generated)
```

## 🛣️ Application Routes

### 🌐 Public Routes (No Authentication Required)
| Route | Component | Description |
|-------|-----------|-------------|
| `/` | HomePage | Landing page with featured products |
| `/products` | ProductsPage | Product catalog with search/filters |
| `/products/:id` | ProductDetailPage | Individual product details |
| `/categories` | CategoriesPage | Browse by product categories |
| `/login` | LoginPage | User authentication |
| `/register` | RegisterPage | User registration |

### 🔒 Protected Routes (Authentication Required)
| Route | Component | Description |
|-------|-----------|-------------|
| `/profile` | ProfilePage | User profile management |
| `/cart` | CartPage | Shopping cart management |
| `/checkout` | CheckoutPage | Order checkout process |
| `/orders` | OrderHistoryPage | User's order history |
| `/orders/:id` | OrderDetailPage | Individual order details |

### 🏪 Seller Routes (Seller Role Required)
| Route | Component | Description |
|-------|-----------|-------------|
| `/seller/dashboard` | SellerDashboardPage | Seller overview and analytics |
| `/seller/products` | SellerProductsPage | Manage seller's products |
| `/seller/products/create` | CreateProductPage | Add new product |
| `/seller/products/:id/edit` | EditProductPage | Edit existing product |

## Key Components

### Layout Components
- **Layout**: Main application layout with navigation
- **ProtectedRoute**: Route wrapper for authenticated pages
- **ErrorBoundary**: Error handling wrapper

### UI Components
- **ProductCard**: Product display card with actions
- **SearchBar**: Product search functionality
- **CategoryFilter**: Filter products by category
- **Pagination**: Navigate through product pages
- **LoadingSpinner**: Loading state indicator
- **Toast**: User notification system
- **FormField**: Reusable form input component

### Context Providers
- **AuthContext**: Manages user authentication state
- **CartContext**: Manages shopping cart state and operations

## State Management

The application uses React Context API for global state management:

### AuthContext
```typescript
interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => void;
  loading: boolean;
}
```

### CartContext
```typescript
interface CartContextType {
  items: CartItem[];
  addItem: (product: Product, quantity: number) => void;
  removeItem: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}
```

## Styling

The application uses **Tailwind CSS** for styling:
- Utility-first CSS framework
- Responsive design out of the box
- Custom configuration in `tailwind.config.js`
- Mobile-first approach

### Key Design Principles
- Clean, modern interface
- Consistent spacing and typography
- Accessible color contrast
- Responsive grid layouts
- Interactive hover states

## API Integration

The frontend communicates with the backend API using Axios:

### Base Configuration
```typescript
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8100';
```

### Authentication
- JWT tokens stored in localStorage
- Automatic token inclusion in API requests
- Token refresh handling
- Logout on token expiration

## Testing

The application includes comprehensive testing with React Testing Library and Jest:

### Test Setup
- **React Testing Library** for component testing
- **Jest** as the test runner
- **@testing-library/user-event** for user interaction testing
- **@testing-library/jest-dom** for additional matchers

### Running Tests
```bash
# Run tests in interactive watch mode (default)
npm test

# Run tests with coverage report
npm test -- --coverage --watchAll=false

# Run all tests once (useful for CI/CD)
npm test -- --watchAll=false
```

### Test Structure
- **Component Tests** - Located in `src/tests/components/`
- **Service Tests** - Located in `src/tests/services/`
- **Performance Tests** - Located in `src/tests/performance/`
- **Integration Tests** - Test user workflows and component interactions
- **Context Provider Tests** - Test AuthContext and CartContext

### Testing Guidelines
- Test user interactions, not implementation details
- Use semantic queries (getByRole, getByLabelText, getByText)
- Mock external API calls and dependencies
- Test error states and loading states
- Ensure accessibility in tests

## Environment Variables

The application uses environment variables for configuration. Create a `.env` file in the frontend directory:

| Variable | Description | Default |
|----------|-------------|---------|
| `REACT_APP_API_URL` | Backend API base URL | http://localhost:8100 |
| `PORT` | Development server port | 3000 |

**Note:** Only environment variables prefixed with `REACT_APP_` are available in the React application.

## Build and Deployment

### Development Build
```bash
npm start
```

### Production Build
```bash
npm run build
```

The build folder will contain optimized production files ready for deployment.

### Deployment Options
- **Static Hosting**: Netlify, Vercel, GitHub Pages
- **CDN**: AWS CloudFront, Azure CDN
- **Traditional Hosting**: Apache, Nginx

## Browser Support

The application supports:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Performance Optimizations

- **Code Splitting**: Automatic route-based code splitting
- **Lazy Loading**: Components loaded on demand
- **Image Optimization**: Responsive images with proper sizing
- **Bundle Analysis**: Use `npm run build` to analyze bundle size

## Development Guidelines

### Code Style
- Use TypeScript for all components
- Follow React best practices
- Use functional components with hooks
- Implement proper error boundaries
- Write meaningful component and variable names

### Component Structure
```typescript
interface ComponentProps {
  // Define prop types
}

const Component: React.FC<ComponentProps> = ({ prop1, prop2 }) => {
  // Component logic
  return (
    <div>
      {/* JSX */}
    </div>
  );
};

export default Component;
```

### Testing Guidelines
- Test user interactions, not implementation details
- Use semantic queries (getByRole, getByLabelText)
- Mock external dependencies
- Test error states and edge cases

## Troubleshooting

### Common Issues

**API Connection Failed:**
- Verify backend API is running (see backend README for setup)
- Check `REACT_APP_API_URL` in `.env` file
- Ensure CORS is configured on the backend API

**Build Errors:**
- Clear node_modules: `rm -rf node_modules && npm install`
- Check TypeScript errors: `npm run build`
- Verify all imports are correct

**Styling Issues:**
- Ensure Tailwind CSS is properly configured
- Check for conflicting CSS classes
- Verify responsive breakpoints

**Authentication Issues:**
- Clear localStorage: `localStorage.clear()`
- Check JWT token expiration
- Verify API endpoints are correct

## Contributing

1. Create feature branch from `main`
2. Follow TypeScript and React best practices
3. Write tests for new components
4. Ensure responsive design
5. Test across different browsers
6. Submit pull request with clear description

## License

MIT License