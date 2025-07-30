# Online Shopping Store - Frontend

A modern React/TypeScript frontend application for the online shopping store, featuring user authentication, product browsing, shopping cart, order management, and seller dashboard functionality.

## Features

- **User Authentication**: Login, registration, and profile management
- **Product Catalog**: Browse products with search, filtering, and pagination
- **Shopping Cart**: Add/remove items, quantity management
- **Order Management**: Checkout process, order history, and order tracking
- **Seller Dashboard**: Product management for sellers
- **Responsive Design**: Mobile-first design with Tailwind CSS
- **Type Safety**: Full TypeScript implementation
- **State Management**: React Context API for global state
- **Error Handling**: Comprehensive error boundaries and user feedback
- **Testing**: Unit and integration tests with React Testing Library

## Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Backend API running on port 8100

### Installation

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   # Create .env file (already exists with defaults)
   # Verify these settings match your backend:
   REACT_APP_API_URL=http://localhost:8100
   PORT=3000
   ```

4. **Start the development server:**
   ```bash
   npm start
   ```

The application will be available at `http://localhost:3000`

## Available Scripts

### Development
- `npm start` - Start development server with hot reload
- `npm run build` - Build for production
- `npm test` - Run test suite
- `npm run eject` - Eject from Create React App (⚠️ irreversible)

## Project Structure

```
frontend/
├── public/              # Static assets
├── src/
│   ├── components/      # Reusable UI components
│   │   ├── CategoryFilter.tsx
│   │   ├── ErrorBoundary.tsx
│   │   ├── FormField.tsx
│   │   ├── Layout.tsx
│   │   ├── LoadingSpinner.tsx
│   │   ├── Pagination.tsx
│   │   ├── ProductCard.tsx
│   │   ├── ProtectedRoute.tsx
│   │   ├── SearchBar.tsx
│   │   └── Toast.tsx
│   ├── contexts/        # React Context providers
│   │   ├── AuthContext.tsx    # User authentication state
│   │   └── CartContext.tsx    # Shopping cart state
│   ├── pages/           # Page components (routes)
│   │   ├── HomePage.tsx
│   │   ├── LoginPage.tsx
│   │   ├── RegisterPage.tsx
│   │   ├── ProductsPage.tsx
│   │   ├── ProductDetailPage.tsx
│   │   ├── CartPage.tsx
│   │   ├── CheckoutPage.tsx
│   │   ├── OrderHistoryPage.tsx
│   │   ├── ProfilePage.tsx
│   │   ├── SellerDashboardPage.tsx
│   │   └── ...
│   ├── services/        # API service functions
│   ├── utils/           # Utility functions
│   ├── tests/           # Test files
│   ├── App.tsx          # Main application component
│   └── index.tsx        # Application entry point
├── build/               # Production build files
├── .env                 # Environment variables
├── tailwind.config.js   # Tailwind CSS configuration
└── package.json         # Dependencies and scripts
```

## Application Routes

### Public Routes
- `/` - Home page with featured products
- `/products` - Product catalog with search and filters
- `/products/:id` - Product detail page
- `/categories` - Browse by categories
- `/login` - User login
- `/register` - User registration

### Protected Routes (Require Authentication)
- `/profile` - User profile management
- `/cart` - Shopping cart
- `/checkout` - Checkout process
- `/orders` - Order history
- `/orders/:id` - Order detail page
- `/upgrade-seller` - Upgrade to seller account

### Seller Routes (Require Seller Role)
- `/seller/dashboard` - Seller dashboard
- `/seller/products` - Manage seller products
- `/seller/products/create` - Create new product
- `/seller/products/:id/edit` - Edit existing product

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

The application includes comprehensive testing:

### Test Setup
- **React Testing Library** for component testing
- **Jest** as the test runner
- **@testing-library/user-event** for user interaction testing

### Running Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test -- --watch

# Run tests with coverage
npm run test -- --coverage
```

### Test Structure
- Component unit tests
- Integration tests for user flows
- Context provider tests
- Utility function tests

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `REACT_APP_API_URL` | Backend API base URL | http://localhost:8100 |
| `PORT` | Development server port | 3000 |

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
- Verify backend is running on port 8100
- Check `REACT_APP_API_URL` in `.env`
- Ensure CORS is configured on backend

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