# Online Shopping Store 🛍️

A full-stack e-commerce application built with Node.js/TypeScript backend and React/TypeScript frontend. Features comprehensive user authentication, product management, order processing, and advanced testing infrastructure.

## 🚀 Features

### Core Functionality
- **User Authentication** - JWT-based auth with secure password hashing
- **Product Management** - Full CRUD operations with categories and inventory
- **Shopping Cart** - Persistent cart with real-time inventory validation
- **Order Processing** - Complete checkout and order management system
- **Seller Dashboard** - Multi-vendor support with seller-specific operations
- **Security** - Comprehensive security measures with rate limiting and input validation

### Advanced Features
- **Load Testing** - Built-in performance testing and monitoring
- **Comprehensive Testing** - Unit, integration, and E2E tests with advanced reporting
- **Performance Monitoring** - Real-time performance metrics and health checks
- **Database Management** - Advanced MySQL operations with connection pooling
- **API Documentation** - Well-documented RESTful API endpoints

## 📁 Project Structure

```
├── backend/                 # Node.js/Express.js API server
│   ├── src/
│   │   ├── __tests__/      # Comprehensive test suite
│   │   │   ├── unit/       # Unit tests
│   │   │   ├── integration/ # Integration tests
│   │   │   └── e2e/        # End-to-end tests
│   │   ├── config/         # Configuration files
│   │   ├── database/       # Database schema and CLI
│   │   ├── load-testing/   # Performance testing utilities
│   │   ├── middleware/     # Express middleware
│   │   ├── models/         # Data models and validation
│   │   ├── repositories/   # Data access layer
│   │   ├── routes/         # API route handlers
│   │   ├── services/       # Business logic layer
│   │   ├── test-configs/   # Advanced test configurations
│   │   └── utils/          # Utility functions
│   ├── docs/               # Documentation
│   ├── test-results/       # Test reports and dashboards
│   └── coverage/           # Test coverage reports
├── frontend/               # React application
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── contexts/       # React contexts
│   │   ├── hooks/          # Custom React hooks
│   │   ├── pages/          # Page components
│   │   ├── services/       # API service layer
│   │   ├── types/          # TypeScript type definitions
│   │   └── utils/          # Utility functions
│   └── build/              # Production build files
├── integration-tests/      # Full-stack integration tests
└── scripts/                # Deployment and utility scripts

```

## 🛠️ Getting Started

### Prerequisites

- **Node.js** (v16 or higher)
- **npm** or **yarn**
- **MySQL** 8.0+
- **Git**

### Quick Setup

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd online-shopping-store
   ```

2. **Backend Setup:**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Edit .env with your database credentials
   npm run db:init
   npm run db:seed
   npm run dev
   ```

3. **Frontend Setup (in a new terminal):**
   ```bash
   cd frontend
   npm install
   npm start
   ```

4. **Access the application:**
   - Frontend: `http://localhost:3000`
   - Backend API: `http://localhost:8100`
   - API Health Check: `http://localhost:8100/api/health`

## 📋 Available Scripts

### Backend Scripts

#### Development
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm run clean` - Clean build artifacts, coverage, and cache
- `npm run clean:all` - Clean everything including node_modules
- `npm run lint` - Run ESLint code analysis
- `npm run lint:fix` - Auto-fix ESLint issues

#### Database Management
- `npm run db:test` - Test database connection
- `npm run db:init` - Initialize database schema
- `npm run db:seed` - Seed database with sample data
- `npm run db:reset` - Reset database (drop, init, seed)
- `npm run db:clear` - Clear all seed data
- `npm run db:setup-integration` - Setup integration test database (auto-run before integration tests)
- `npm run db:setup-e2e` - Setup e2e test database (auto-run before e2e tests)

#### Testing & Quality Assurance
- `npm test` - Run unit tests (default)
- `npm run test:unit` - Run unit tests with reporting
- `npm run test:integration` - Run integration tests (auto-sets up test database)
- `npm run test:e2e` - Run end-to-end tests (auto-builds and sets up test database)
- `npm run test:all` - Run all tests with combined reporting
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Generate coverage reports
- `npm run test:coverage:all` - Generate coverage for all test types
- `npm run test:report` - Generate combined test dashboard
- `npm run test:report:open` - Generate and open test dashboard

#### Performance & Load Testing
- `npm run load-test` - Run load testing suite
- `npm run load-test:build` - Build and run load tests

### Frontend Scripts

- `npm start` - Start development server
- `npm run build` - Build for production
- `npm test` - Run tests
- `npm run clean` - Clean build artifacts and cache
- `npm run clean:all` - Clean everything including node_modules
- `npm run eject` - Eject from Create React App (not recommended)

## 🏗️ Technology Stack

### Backend
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: MySQL 8 with connection pooling
- **Authentication**: JWT with bcrypt password hashing
- **Security**: Helmet.js, CORS, rate limiting, input validation
- **Testing**: Jest with comprehensive test architecture
- **Load Testing**: Custom performance testing framework
- **Documentation**: Comprehensive API documentation

### Frontend
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS
- **Routing**: React Router v6
- **HTTP Client**: Axios with interceptors
- **State Management**: React Context API
- **Build Tool**: Create React App with TypeScript template

### Development & DevOps
- **Code Quality**: ESLint, TypeScript strict mode
- **Testing**: Jest, Supertest, comprehensive test reporting
- **Environment Management**: dotenv with multiple environments
- **Performance Monitoring**: Built-in performance metrics
- **Documentation**: Markdown with comprehensive guides

## 🧪 Testing

This project features a comprehensive testing architecture with unit, integration, and end-to-end tests.

### Running Tests

All tests include automatic database setup - just run the commands and everything will be configured for you:

#### Unit Tests
```bash
cd backend
npm run test:unit
```
- Fast, isolated component testing
- No database setup required
- Tests business logic, utilities, and individual components

#### Integration Tests  
```bash
cd backend
npm run test:integration
```
- Tests component interactions with real database
- Automatically sets up `online_shopping_store_test_integration` database
- Tests API endpoints, services, and database operations

#### End-to-End Tests
```bash
cd backend
npm run test:e2e
```
- Complete user workflow testing
- Automatically builds the application and sets up `online_shopping_store_test_e2e` database
- Tests full application flows from frontend to database

#### Run All Tests
```bash
cd backend
npm run test:all
```
- Runs unit, integration, and e2e tests in sequence
- Generates comprehensive test reports and coverage
- Creates HTML dashboard with results

#### Test Reports
```bash
cd backend
npm run test:report:open
```
- Generates and opens interactive test dashboard
- Shows test results, coverage, and performance metrics
- Available at `backend/test-results/combined/dashboard.html`

### Test Features
- **Automatic Setup** - All database setup handled automatically
- **Isolated Environments** - Each test type uses separate databases
- **Advanced Reporting** - HTML dashboards with performance metrics
- **Coverage Analysis** - Detailed coverage reports for all test types
- **Performance Monitoring** - Automatic detection of slow tests

## 🔒 Security Features

- **Authentication**: JWT-based stateless authentication
- **Password Security**: bcrypt hashing with configurable salt rounds
- **Input Validation**: Comprehensive request validation and sanitization
- **Rate Limiting**: API endpoint protection against abuse
- **CORS Configuration**: Secure cross-origin resource sharing
- **Security Headers**: Helmet.js for security headers
- **SQL Injection Protection**: Parameterized queries and ORM patterns

## 📊 Performance & Monitoring

- **Performance Metrics**: Real-time performance monitoring
- **Health Checks**: Comprehensive system health endpoints
- **Load Testing**: Built-in performance testing framework
- **Database Optimization**: Connection pooling and query optimization
- **Memory Management**: Optimized memory usage and garbage collection

## 🚀 Deployment

This application includes:

- **Environment Configuration**: Separate configs for different environments
- **Security Features**: Security configurations and best practices
- **Performance Optimization**: Optimized for better performance
- **Monitoring**: Built-in health checks and performance metrics
- **Documentation**: Comprehensive setup and deployment guides

## 📚 Documentation

- **API Documentation**: Complete API endpoint documentation
- **Testing Guide**: Comprehensive testing documentation
- **Deployment Guide**: Step-by-step deployment instructions
- **Security Guide**: Security best practices and configurations
- **Performance Guide**: Performance optimization recommendations

## 🤝 Development

### Code Quality
- **TypeScript**: Full type safety across the entire stack
- **ESLint**: Consistent code style and quality enforcement
- **Testing**: Comprehensive test coverage with quality gates
- **Documentation**: Well-documented code and APIs

### Development Workflow
- **Hot Reload**: Instant feedback during development
- **Environment Isolation**: Separate development and production configurations
- **Test-Driven Development**: Comprehensive testing at all levels
- **Performance Monitoring**: Built-in performance tracking

## 📈 Project Status

✅ **Complete Features:**
- User authentication and authorization
- Product and category management
- Shopping cart and order processing
- Seller dashboard and management
- Comprehensive testing infrastructure
- Security hardening and performance optimization
- Load testing and monitoring capabilities

🚀 **Development Status:**
- Comprehensive test coverage with automated setup
- Security best practices implemented
- Performance optimized
- Documentation complete

---

For detailed setup instructions, API documentation, and deployment guides, see the respective README files in the `backend/` and `frontend/` directories.