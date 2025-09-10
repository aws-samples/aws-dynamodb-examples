# Online Shopping Store 🛍️

A modern, full-stack e-commerce platform built with Node.js/TypeScript backend and React/TypeScript frontend. This application demonstrates enterprise-grade development practices with comprehensive testing, security, performance monitoring, and load testing capabilities.

## 🚀 Database Modernizer Workflow

> **⚠️ IMPORTANT: Before running any modernization commands, you MUST complete the prerequisites and setup steps!**
>
> **📋 Complete setup guide with prerequisites:** **[prompts/README.md](./prompts/README.md)**
>
> This includes AWS credentials, AWS connectivity, infrastructure setup (on-prem simulation), and configuration validation.

## ✨ Key Features

### 🛒 E-commerce Core
- **User Authentication & Authorization** - Secure JWT-based authentication with role-based access
- **Product Catalog Management** - Full CRUD operations with categories, search, and filtering
- **Shopping Cart & Checkout** - Persistent cart with real-time inventory validation
- **Order Management** - Complete order processing and tracking system
- **Multi-vendor Support** - Seller dashboard with product management capabilities

### 🔧 Technical Excellence
- **Comprehensive Testing Suite** - Unit, integration, and E2E tests with 80%+ coverage
- **Load Testing Infrastructure** - Cypress-based browser automation for realistic load testing
- **Performance Monitoring** - Real-time metrics, health checks, and database monitoring
- **Security Hardening** - Rate limiting, input validation, CORS, and security headers
- **Database Optimization** - MySQL with connection pooling and query optimization

## 📁 Project Architecture

```
online-shopping-store/
├── 🔧 backend/                    # Node.js/TypeScript API Server
│   ├── src/
│   │   ├── __tests__/            # Comprehensive test suite (unit, integration, e2e)
│   │   ├── config/               # Application configuration
│   │   ├── database/             # Database schema, migrations, and CLI tools
│   │   ├── middleware/           # Express middleware (auth, validation, security)
│   │   ├── models/               # Data models and TypeScript interfaces
│   │   ├── repositories/         # Data access layer with MySQL integration
│   │   ├── routes/               # RESTful API route handlers
│   │   ├── services/             # Business logic and service layer
│   │   ├── utils/                # Utility functions and helpers
│   │   └── test-configs/         # Advanced testing configurations
│   ├── docs/                     # API documentation
│   ├── coverage/                 # Test coverage reports
│   └── test-results/             # Test reports and dashboards
│
├── 🎨 frontend/                   # React/TypeScript Client Application
│   ├── src/
│   │   ├── components/           # Reusable UI components
│   │   ├── contexts/             # React Context providers (Auth, Cart)
│   │   ├── pages/                # Route-based page components
│   │   ├── services/             # API integration layer
│   │   ├── types/                # TypeScript type definitions
│   │   └── utils/                # Client-side utilities
│   ├── public/                   # Static assets
│   └── build/                    # Production build output
│
├── 🧪 cypress/                    # E2E Testing & Load Testing Infrastructure
│   ├── e2e/                      # End-to-end test specifications
│   ├── fixtures/                 # Test data and configurations
│   ├── support/                  # Custom commands and utilities
│   │   └── database-monitoring/  # Database performance monitoring
│   ├── load-testing/             # Load testing orchestration
│   └── reports/                  # Test execution reports
│
├── 🔗 integration-tests/          # Full-stack integration tests
├── 📜 scripts/                    # Deployment and utility scripts
└── 📋 Configuration Files         # Root-level configs and documentation
```

## 🚀 Quick Start Guide

### Prerequisites

- **Node.js** v18+ (recommended) or v16+
- **npm** or **yarn** package manager
- **MySQL** 8.0+ database server
- **Git** version control

### 🏃‍♂️ One-Command Setup

```bash
# Clone and install all dependencies
git clone <repository-url>
cd online-shopping-store
npm run install:all
```

### 🔧 Manual Setup

#### 1. Backend API Server
```bash
cd backend
npm install
cp .env.example .env
# Configure your database credentials in .env
npm run db:init      # Initialize database schema
npm run db:seed      # Add sample data
npm run dev          # Start development server
```

#### 2. Frontend Application
```bash
cd frontend
npm install
npm start            # Start React development server
```

#### 3. E2E Testing (Optional)
```bash
# Install Cypress dependencies (already included in install:all)
npm run e2e:verify   # Verify Cypress setup
```

### 🌐 Access Points

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend App** | http://localhost:3000 | React application |
| **Backend API** | http://localhost:8100 | RESTful API server |
| **Health Check** | http://localhost:8100/api/health | API status endpoint |
| **API Docs** | http://localhost:8100/api/docs | API documentation |

## 📋 Development Commands

### 🏗️ Project-Level Commands
```bash
# Install all dependencies (backend + frontend + cypress)
npm run install:all

# Run E2E infrastructure verification
npm run e2e:verify

# Run comprehensive load testing (Cypress-based)
npm run load-test
```

### 🔧 Backend Development
```bash
cd backend

# Development & Building
npm run dev              # Start with hot reload
npm run build            # Compile TypeScript
npm start               # Production server

# Database Management
npm run db:test         # Test connection
npm run db:init         # Initialize schema
npm run db:seed         # Add sample data
npm run db:reset        # Full reset (drop/init/seed)

# Testing Suite
npm test                # Unit tests (fast)
npm run test:integration # Integration tests
npm run test:e2e        # End-to-end tests
npm run test:all        # All tests + reports
npm run test:report:open # Open test dashboard

# Code Quality
npm run lint            # ESLint analysis
npm run lint:fix        # Auto-fix issues
```

### 🎨 Frontend Development
```bash
cd frontend

# Development
npm start               # Development server
npm run build           # Production build
npm test                # Run test suite

# Maintenance
npm run clean           # Clean build artifacts
npm run security:check  # Security audit
```

### 🧪 E2E Testing & Load Testing
```bash
# Infrastructure verification (no servers needed)
npm run e2e:verify

# Full setup verification (requires running servers)
npm run e2e:verify:full

# Load testing (Cypress-based browser automation)
npm run load-test:light    # Light load test
npm run cypress:run        # Run all E2E tests
```

## 🛠️ Technology Stack

### 🔧 Backend Infrastructure
| Technology | Purpose | Version |
|------------|---------|---------|
| **Node.js** | Runtime environment | v18+ |
| **TypeScript** | Type-safe development | v5.8+ |
| **Express.js** | Web framework | v5.1+ |
| **MySQL** | Primary database | v8.0+ |
| **JWT** | Authentication | Latest |
| **bcrypt** | Password hashing | v6.0+ |
| **Jest** | Testing framework | v30+ |

### 🎨 Frontend Technologies
| Technology | Purpose | Version |
|------------|---------|---------|
| **React** | UI framework | v19.1+ |
| **TypeScript** | Type safety | v4.9+ |
| **Tailwind CSS** | Styling framework | Latest |
| **React Router** | Client-side routing | v6.30+ |
| **Axios** | HTTP client | v1.11+ |
| **Context API** | State management | Built-in |

### 🧪 Testing & Quality Assurance
| Tool | Purpose | Coverage |
|------|---------|----------|
| **Jest** | Unit & integration testing | 80%+ |
| **Supertest** | API testing | Full API |
| **Cypress** | E2E & load testing | Critical paths |
| **ESLint** | Code quality | Strict rules |
| **TypeScript** | Type checking | Strict mode |

### 🔒 Security & Performance
- **Helmet.js** - Security headers
- **CORS** - Cross-origin resource sharing
- **Rate limiting** - API protection
- **Input validation** - Data sanitization
- **Connection pooling** - Database optimization
- **Performance monitoring** - Real-time metrics

## 🧪 Comprehensive Testing Strategy

This project implements a robust testing pyramid with automated setup and comprehensive reporting.

### 🏗️ Testing Architecture

```
                    🔺 E2E Tests (Cypress)
                   /   Browser automation
                  /    Full user workflows
                 /     Database monitoring
                /      Load testing
               /
              🔺 Integration Tests (Jest)
             /   Component interactions
            /    Real database operations
           /     API endpoint testing
          /
         🔺 Unit Tests (Jest)
        /   Fast, isolated testing
       /    Business logic validation
      /     Utility function testing
     /
    🔺 Foundation: TypeScript + ESLint
```

### 🚀 Quick Testing Commands

```bash
# Backend testing (from backend/ directory)
npm test                    # Unit tests (fastest feedback)
npm run test:integration    # Integration tests with DB
npm run test:e2e           # End-to-end API tests
npm run test:all           # Complete test suite + reports
npm run test:report:open   # Interactive test dashboard

# Frontend testing (from frontend/ directory)
npm test                   # React component tests

# E2E & Load testing (from root directory)
npm run e2e:verify         # Cypress infrastructure check
npm run load-test          # Browser-based load testing
```

### 📊 Test Features

#### ✅ Automatic Database Management
- **Isolated Test Databases** - Each test type uses separate databases
- **Auto-Setup** - Database schema and data automatically configured
- **Zero Configuration** - Just run the tests, everything is handled

#### 📈 Advanced Reporting
- **Interactive Dashboard** - HTML reports with metrics and coverage
- **Performance Tracking** - Automatic slow test detection
- **Coverage Analysis** - Detailed coverage reports for all test types
- **CI/CD Ready** - JUnit XML and JSON outputs

#### 🔄 Test Types Explained

| Test Type | Speed | Database | Purpose | Coverage |
|-----------|-------|----------|---------|----------|
| **Unit** | ⚡ Fast | ❌ Mocked | Business logic | 80%+ |
| **Integration** | 🚀 Medium | ✅ Real | Component interactions | API endpoints |
| **E2E (Backend)** | 🐌 Slow | ✅ Real | Full workflows | Critical paths |
| **E2E (Cypress)** | 🐌 Slow | ✅ Real | Browser automation | User journeys |

## 🔒 Security & Performance

### 🛡️ Security Hardening
- **🔐 JWT Authentication** - Stateless, secure token-based auth
- **🔑 Password Security** - bcrypt hashing with configurable salt rounds
- **✅ Input Validation** - Comprehensive request validation and sanitization
- **🚦 Rate Limiting** - API endpoint protection against abuse
- **🌐 CORS Configuration** - Secure cross-origin resource sharing
- **🛡️ Security Headers** - Helmet.js for comprehensive security headers
- **💉 SQL Injection Protection** - Parameterized queries and safe patterns

### ⚡ Performance Optimization
- **📊 Real-time Monitoring** - Performance metrics and health checks
- **🔄 Connection Pooling** - Optimized database connections
- **🧠 Memory Management** - Optimized memory usage and garbage collection
- **📈 Load Testing** - Cypress-based browser automation for realistic testing
- **🎯 Query Optimization** - Efficient database operations

### 🚀 Production Readiness
- **🌍 Environment Configuration** - Separate configs for dev/staging/production
- **📋 Health Checks** - Comprehensive system health endpoints
- **📊 Monitoring Dashboard** - Built-in performance metrics
- **📚 Documentation** - Complete setup and deployment guides
- **🔧 CI/CD Ready** - Automated testing and deployment pipelines

## 📚 Documentation Structure

| Document | Location | Purpose |
|----------|----------|---------|
| **Main README** | `/README.md` | Project overview and quick start |
| **Backend Guide** | `/backend/README.md` | API development and testing |
| **Frontend Guide** | `/frontend/README.md` | React app development |
| **E2E Testing** | `/cypress/README.md` | Load testing and automation |
| **API Documentation** | `/backend/docs/` | Detailed API specifications |

## 🤝 Development Workflow

### 🎯 Code Quality Standards
- **TypeScript First** - Full type safety across the entire stack
- **ESLint Enforcement** - Consistent code style and quality gates
- **Test-Driven Development** - Write tests before implementation
- **Documentation** - Well-documented code and clear commit messages

### 🔄 Development Process
1. **Setup** - Use `npm run install:all` for complete environment setup
2. **Development** - Hot reload enabled for both frontend and backend
3. **Testing** - Run tests frequently with `npm test` (backend) or `npm run e2e:verify`
4. **Quality Gates** - ESLint and TypeScript checks before commits
5. **Performance** - Built-in monitoring and load testing validation

## 📈 Project Status & Roadmap

### ✅ Completed Features
- **Core E-commerce** - Authentication, products, cart, orders, seller dashboard
- **Testing Infrastructure** - Unit, integration, E2E, and load testing
- **Security Hardening** - JWT auth, input validation, rate limiting, security headers
- **Performance Optimization** - Database pooling, query optimization, monitoring
- **Documentation** - Comprehensive guides and API documentation

### 🚀 Current State
- **Test Coverage** - 80%+ coverage with automated reporting
- **Security Compliant** - Industry-standard security practices
- **Performance Optimized** - Load tested and monitored
- **Developer Friendly** - Hot reload, TypeScript, comprehensive tooling

### 🔮 Future Enhancements
- **Microservices Architecture** - Service decomposition for scalability
- **Advanced Analytics** - User behavior tracking and business intelligence
- **Mobile App** - React Native mobile application
- **Payment Integration** - Stripe/PayPal payment processing
- **Inventory Management** - Advanced inventory tracking and alerts

---

## 🚀 Getting Started

Ready to dive in? Check out the detailed setup guides:

- **🔧 Backend Development** → [backend/README.md](./backend/README.md)
- **🎨 Frontend Development** → [frontend/README.md](./frontend/README.md)  
- **🧪 E2E Testing & Load Testing** → [cypress/README.md](./cypress/README.md)

For questions or contributions, please refer to the individual README files in each directory for detailed instructions and best practices.