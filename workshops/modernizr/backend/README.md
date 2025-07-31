# Online Shopping Store - Backend API

A robust Node.js/TypeScript backend API for the online shopping store application, featuring user authentication, product management, order processing, and load testing capabilities.

## Features

- **User Authentication**: JWT-based authentication with secure password hashing
- **Product Management**: CRUD operations for products and categories
- **Order Processing**: Complete order management system
- **Database Integration**: MySQL 8 with connection pooling
- **Load Testing**: Built-in load testing utilities
- **Security**: Helmet.js, CORS, input validation
- **Testing**: Comprehensive test suite with Jest
- **TypeScript**: Full type safety and modern JavaScript features

## Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- MySQL 8.0+

### Installation

1. **Clone and navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=your_db_user
   DB_PASSWORD=your_db_password
   DB_NAME=online_shopping_store
   PORT=8100
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   ```

4. **Set up the database:**
   ```bash
   # Test database connection
   npm run db:test
   
   # Initialize database schema
   npm run db:init
   
   # Seed with sample data
   npm run db:seed
   ```

5. **Start the development server:**
   ```bash
   npm run dev
   ```

The API will be available at `http://localhost:8100`

## Available Scripts

### Development
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server

### Code Quality
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues automatically

### Testing
- `npm test` - Run unit tests (fast feedback)
- `npm run test:unit` - Run unit tests only
- `npm run test:integration` - Run integration tests (auto-sets up test database)
- `npm run test:e2e` - Run end-to-end tests (auto-builds and sets up test database)
- `npm run test:all` - Run all test types in sequence with comprehensive reporting
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm run test:report:open` - Generate and open interactive test dashboard

### Database Management
- `npm run db:test` - Test database connection
- `npm run db:init` - Initialize database schema
- `npm run db:seed` - Seed database with sample data
- `npm run db:reset` - Reset database (drop, init, seed)
- `npm run db:clear` - Clear all seed data
- `npm run db:setup-integration` - Setup integration test database (auto-run before integration tests)
- `npm run db:setup-e2e` - Setup e2e test database (auto-run before e2e tests)

### Load Testing
- `npm run load-test` - Run load testing suite
- `npm run load-test:build` - Build and run load tests

## Project Structure

```
backend/
├── src/
│   ├── config/          # Configuration files
│   ├── database/        # Database setup and CLI tools
│   ├── middleware/      # Express middleware
│   ├── models/          # Data models and interfaces
│   ├── repositories/    # Data access layer
│   ├── routes/          # API route definitions
│   ├── services/        # Business logic layer
│   ├── utils/           # Utility functions
│   ├── load-testing/    # Load testing utilities
│   ├── __tests__/       # Test files
│   │   ├── unit/        # Unit tests (fast, isolated)
│   │   ├── integration/ # Integration tests (component interactions)
│   │   └── e2e/         # End-to-end tests (full workflows)
│   ├── test-configs/    # Test configuration and helpers
│   └── index.ts         # Application entry point
├── dist/                # Compiled JavaScript files
├── coverage/            # Test coverage reports
├── .env.example         # Environment variables template
└── package.json         # Dependencies and scripts
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile (protected)

### Products
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get product by ID
- `POST /api/products` - Create product (admin)
- `PUT /api/products/:id` - Update product (admin)
- `DELETE /api/products/:id` - Delete product (admin)

### Categories
- `GET /api/categories` - Get all categories
- `POST /api/categories` - Create category (admin)

### Orders
- `GET /api/orders` - Get user orders (protected)
- `POST /api/orders` - Create order (protected)
- `GET /api/orders/:id` - Get order by ID (protected)

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_HOST` | Database host | localhost |
| `DB_PORT` | Database port | 3306 |
| `DB_USER` | Database username | root |
| `DB_PASSWORD` | Database password | - |
| `DB_NAME` | Database name | online_shopping_store |
| `DB_CONNECTION_LIMIT` | Max database connections | 10 |
| `DB_ACQUIRE_TIMEOUT` | Connection acquire timeout (ms) | 60000 |
| `DB_TIMEOUT` | Query timeout (ms) | 60000 |
| `PORT` | Server port | 8100 |
| `JWT_SECRET` | JWT signing secret | - |
| `JWT_EXPIRES_IN` | JWT expiration time | 24h |
| `NODE_ENV` | Environment | development |
| `BCRYPT_SALT_ROUNDS` | Password hashing salt rounds | 12 |
| `MEMORY_WARNING_THRESHOLD` | Memory warning threshold (%) | 85 |
| `MEMORY_CRITICAL_THRESHOLD` | Memory critical threshold (%) | 95 |
| `RATE_LIMIT_MAX_REQUESTS` | Global rate limit max requests | 10000 |
| `RATE_LIMIT_WINDOW_MS` | Global rate limit window (ms) | 60000 |
| `RATE_LIMIT_AUTH_MAX` | Auth rate limit max requests | 1000 |
| `RATE_LIMIT_AUTH_WINDOW_MS` | Auth rate limit window (ms) | 60000 |

## Database Schema

The application uses MySQL with the following main tables:
- `users` - User accounts and authentication
- `categories` - Product categories
- `products` - Product catalog
- `orders` - Customer orders
- `order_items` - Order line items

## Load Testing

The backend includes built-in load testing capabilities:

```bash
# Run basic load test
npm run load-test

# Run with custom parameters
npm run load-test -- --users 100 --duration 60s --endpoint /api/products
```

## Development Guidelines

### Code Style
- Use TypeScript for all new code
- Follow ESLint configuration
- Write tests for new features
- Use meaningful commit messages

### Testing

Our testing architecture follows the testing pyramid with automatic database setup:

**Unit Tests** (`npm run test:unit`)
- Fast execution (< 10 seconds)
- Test individual functions/classes in isolation
- All external dependencies mocked
- No database setup required
- Located in `src/__tests__/unit/`

**Integration Tests** (`npm run test:integration`)
- Medium execution speed (< 60 seconds)
- Test component interactions with real database
- Automatically sets up `online_shopping_store_test_integration` database
- External services mocked
- Located in `src/__tests__/integration/`

**End-to-End Tests** (`npm run test:e2e`)
- Comprehensive testing (< 120 seconds)
- Test complete user workflows
- Automatically builds application and sets up `online_shopping_store_test_e2e` database
- Real server + database + HTTP requests
- Located in `src/__tests__/e2e/`

**Test Reports** (`npm run test:report:open`)
- Interactive HTML dashboard with test results
- Coverage analysis and performance metrics
- Available at `test-results/combined/dashboard.html`

**Guidelines:**
- All database setup is automatic - just run the test commands
- Each test type uses isolated databases to prevent interference
- Write unit tests for business logic
- Write integration tests for component interactions
- Write E2E tests for critical user workflows
- Maintain test coverage above 80%

### Security
- Always validate input data
- Use parameterized queries for database operations
- Keep JWT secrets secure
- Implement proper error handling

## Troubleshooting

### Common Issues

**Database Connection Failed:**
- Verify MySQL is running
- Check database credentials in `.env`
- Ensure database exists

**Port Already in Use:**
- Change `PORT` in `.env` file
- Kill existing process: `lsof -ti:8100 | xargs kill`

**Build Errors:**
- Clear node_modules: `rm -rf node_modules && npm install`
- Check TypeScript version compatibility

## Contributing

1. Create feature branch from `main`
2. Make changes with tests
3. Run `npm run lint` and `npm test`
4. Submit pull request

## License

MIT License