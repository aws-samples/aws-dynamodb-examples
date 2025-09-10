# Backend API Server 🔧

Node.js/TypeScript REST API server for the online shopping store. This backend provides secure authentication, product management, order processing, and comprehensive testing infrastructure.

## 🚀 Quick Start

```bash
cd backend
npm install
cp .env.example .env    # Configure your database
npm run db:init         # Initialize database
npm run db:seed         # Add sample data
npm run dev            # Start development server
```

**Server will be available at:** `http://localhost:8100`

## 🔧 Environment Configuration

### Required Environment Variables

Create `.env` file from the example:

```bash
cp .env.example .env
```

**Essential Configuration:**
```env
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=online_shopping_store

# Server Configuration
PORT=8100
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Security Settings (optional - defaults provided)
BCRYPT_SALT_ROUNDS=12
RATE_LIMIT_MAX_REQUESTS=10000
```

### Database Setup Commands

```bash
npm run db:test     # Test database connection
npm run db:init     # Create tables and schema
npm run db:seed     # Add sample data (users, products, categories)
npm run db:reset    # Full reset (drop + init + seed)
```

## 📋 Development Commands

### 🏗️ Development & Building
```bash
npm run dev         # Development server with hot reload
npm run build       # Compile TypeScript to JavaScript
npm start          # Production server
npm run lint       # ESLint code analysis
npm run lint:fix   # Auto-fix ESLint issues
```

### 🗄️ Database Management
```bash
npm run db:test    # Test database connection
npm run db:init    # Initialize schema
npm run db:seed    # Add sample data
npm run db:reset   # Full reset (drop/init/seed)
npm run db:clear   # Clear seed data only
```

### 🧪 Testing Suite
```bash
npm test                    # Unit tests (fastest)
npm run test:integration    # Integration tests (auto DB setup)
npm run test:e2e           # End-to-end tests (auto build + DB setup)
npm run test:all           # All tests + comprehensive reporting
npm run test:watch         # Watch mode for development
npm run test:coverage      # Coverage reports
npm run test:report:open   # Interactive test dashboard
```

### 🔧 Maintenance
```bash
npm run clean      # Clean build artifacts and cache
npm run clean:all  # Clean everything including node_modules
```

**Note:** Load testing is now handled by the Cypress infrastructure in the root directory. See `/cypress/README.md` for load testing capabilities.

## 📁 Backend Architecture

```
backend/src/
├── � coknfig/              # Application configuration
├── 🗄️ database/            # Schema, migrations, CLI tools
├── 🛡️ middleware/          # Express middleware (auth, validation, security)
├── 📋 models/              # TypeScript interfaces and data models
├── �  repositories/        # Data access layer (MySQL integration)
├── �️ rotutes/              # RESTful API endpoints
├── ⚙️ services/            # Business logic and service layer
├── � utilss/               # Utility functions and helpers
├── 🧪 __tests__/           # Comprehensive test suite
│   ├── unit/              # Fast, isolated unit tests
│   ├── integration/       # Component interaction tests
│   └── e2e/               # Full workflow end-to-end tests
├── ⚙️ test-configs/        # Advanced testing configurations
├── 🚀 app.ts               # Express application setup
└── 🚀 index.ts             # Application entry point

Generated:
├── � dipst/                # Compiled JavaScript (npm run build)
├── � covexrage/            # Test coverage reports
└── 📈 test-results/        # Test execution reports and dashboards
```

## 🛣️ API Endpoints Overview

### 🔐 Authentication (`/api/auth`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/register` | User registration | ❌ |
| POST | `/login` | User login | ❌ |
| GET | `/profile` | Get user profile | ✅ |

### 🛍️ Products (`/api/products`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/` | List all products | ❌ |
| GET | `/:id` | Get product details | ❌ |
| POST | `/` | Create product | ✅ (Seller/Admin) |
| PUT | `/:id` | Update product | ✅ (Owner/Admin) |
| DELETE | `/:id` | Delete product | ✅ (Owner/Admin) |

### 📂 Categories (`/api/categories`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/` | List categories | ❌ |
| POST | `/` | Create category | ✅ (Admin) |

### 📦 Orders (`/api/orders`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/` | User's orders | ✅ |
| POST | `/` | Create order | ✅ |
| GET | `/:id` | Order details | ✅ (Owner) |

### 🏥 System (`/api`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/health` | Health check | ❌ |
| GET | `/docs` | API documentation | ❌ |

## 🔧 Environment Variables Reference

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

## 🗄️ Database Schema

The application uses MySQL with the following main tables:
- `users` - User accounts and authentication
- `categories` - Product categories
- `products` - Product catalog
- `orders` - Customer orders
- `order_items` - Order line items

## 🧪 Testing Architecture

Our testing follows the testing pyramid with automatic database setup:

### Unit Tests (`npm run test:unit`)
- **Speed**: Fast execution (< 10 seconds)
- **Scope**: Individual functions/classes in isolation
- **Dependencies**: All external dependencies mocked
- **Database**: No database setup required
- **Location**: `src/__tests__/unit/`

### Integration Tests (`npm run test:integration`)
- **Speed**: Medium execution (< 60 seconds)
- **Scope**: Component interactions with real database
- **Database**: Automatically sets up `online_shopping_store_test_integration`
- **Dependencies**: External services mocked
- **Location**: `src/__tests__/integration/`

### End-to-End Tests (`npm run test:e2e`)
- **Speed**: Comprehensive testing (< 120 seconds)
- **Scope**: Complete user workflows
- **Database**: Automatically builds app and sets up `online_shopping_store_test_e2e`
- **Dependencies**: Real server + database + HTTP requests
- **Location**: `src/__tests__/e2e/`

### Test Reports (`npm run test:report:open`)
- Interactive HTML dashboard with test results
- Coverage analysis and performance metrics
- Available at `test-results/combined/dashboard.html`

### Testing Guidelines
- All database setup is automatic - just run the test commands
- Each test type uses isolated databases to prevent interference
- Write unit tests for business logic
- Write integration tests for component interactions
- Write E2E tests for critical user workflows
- Maintain test coverage above 80%

## 🛡️ Security & Best Practices

### Code Style
- Use TypeScript for all new code
- Follow ESLint configuration
- Write tests for new features
- Use meaningful commit messages

### Security Guidelines
- Always validate input data
- Use parameterized queries for database operations
- Keep JWT secrets secure
- Implement proper error handling

## 🔧 Troubleshooting

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

## 🤝 Contributing

1. Create feature branch from `main`
2. Make changes with tests
3. Run `npm run lint` and `npm test`
4. Submit pull request

## 📄 License

MIT License