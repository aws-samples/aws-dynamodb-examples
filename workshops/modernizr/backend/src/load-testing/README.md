# Load Testing and User Simulation System

A comprehensive load testing framework for the Online Shopping Store that simulates realistic user behavior and generates meaningful performance data.

## 🚀 Quick Start

```bash
# Check system requirements
npm run load-test validate

# View system information
npm run load-test info

# See configuration examples
npm run load-test config

# Run quick start guide
npm run load-test quick-start
```

## 📁 Project Structure

```
src/load-testing/
├── types/                  # TypeScript interfaces and types
│   ├── index.ts           # Core types and enums
│   └── interfaces.ts      # Component interfaces
├── config/                # Configuration management
│   └── schema.ts          # Config validation and defaults
├── utils/                 # Utility functions
│   ├── helpers.ts         # General utilities
│   └── apiClient.ts       # HTTP client for API calls
├── controllers/           # Main orchestration (to be implemented)
├── simulators/           # User behavior simulators (to be implemented)
├── seeders/              # Data seeding components (to be implemented)
├── monitors/             # Performance monitoring (to be implemented)
├── __tests__/            # Test files
├── cli.ts                # Command-line interface
├── index.ts              # Main entry point
└── README.md             # This file
```

## 🎯 Features

### ✅ Completed (Task 1)
- **Core Type System**: Comprehensive TypeScript interfaces for all components
- **Configuration Management**: Validation, defaults, and multiple test scenarios
- **Utility Functions**: Random data generation, delays, ID generation, metrics calculation
- **API Client**: HTTP client with authentication, retries, and performance tracking
- **CLI Interface**: Command-line tools for system validation and configuration
- **Test Suite**: Unit tests for all core components

### 🚧 In Progress
- **Data Seeder**: Generate categories, products, users, and sellers
- **Test Controller**: Orchestrate load tests and manage execution
- **User Simulators**: Browser, buyer, and seller behavior simulation
- **Performance Monitor**: Real-time metrics collection and reporting

## 🔧 Configuration

### Default Configuration
- **25 concurrent users** for 5 minutes
- **40% browser users**, 50% buyer users, 10% seller users
- **1000 products** across 6 categories
- **50 test users** with 5 sellers

### Stress Test Configuration
- **100 concurrent users** for 10 minutes
- **5000 products** across 8 categories
- **200 test users** with 20 sellers

### Quick Test Configuration
- **10 concurrent users** for 2 minutes
- **100 products** across 4 categories
- **20 test users** with 2 sellers

## 🎭 User Behavior Simulation

### Browser Users (40%)
- Browse product listings
- Search and filter products
- View product details
- Navigate categories
- Realistic viewing delays (1-5 seconds)

### Buyer Users (50%)
- All browser behaviors plus:
- Add items to cart (1-3 items per session)
- Modify cart quantities
- Complete checkout process
- View order history

### Seller Users (10%)
- Upgrade to seller accounts
- Create new products
- Update inventory levels
- Manage product listings
- View seller dashboard

## 📊 Performance Monitoring

### Metrics Collected
- **API Response Times**: Average, min, max, P95, P99
- **Success/Failure Rates**: Per endpoint and overall
- **System Resources**: Memory, CPU, database connections
- **User Behavior**: Session duration, actions per user
- **Error Tracking**: Categorized errors with context

### Reports Generated
- **Test Summary**: Overall performance statistics
- **Endpoint Analysis**: Per-API performance breakdown
- **Error Analysis**: Detailed error categorization
- **Recommendations**: Performance improvement suggestions

## 🛠️ Development

### Running Tests
```bash
# Run all load testing tests
npm test -- --testPathPatterns=load-testing

# Run with coverage
npm run test:coverage -- --testPathPatterns=load-testing
```

### Building
```bash
# Compile TypeScript
npm run build

# Run compiled CLI
npm run load-test:build help
```

### Adding New Components
1. Define interfaces in `types/interfaces.ts`
2. Implement component in appropriate directory
3. Add tests in `__tests__/`
4. Export from `index.ts`

## 🎯 Next Steps

### Task 2: Data Seeder Implementation
- Category hierarchy generation
- Realistic product creation
- User account seeding
- Seller assignment

### Task 3: Test Controller
- Test orchestration
- User pool management
- Progress monitoring
- Result aggregation

### Task 4: User Simulators
- Browser behavior patterns
- Shopping cart simulation
- Checkout process
- Seller operations

## 📚 API Reference

### Core Types
```typescript
import { LoadTestConfig, TestResults, UserSession } from './types';
```

### Configuration
```typescript
import { ConfigDefaults, ConfigValidator } from './config/schema';

const config = ConfigDefaults.getDefaultConfig();
const validation = ConfigValidator.validate(config);
```

### Utilities
```typescript
import { RandomDataGenerator, DelayManager, ApiClient } from './utils';

const username = RandomDataGenerator.generateUsername();
await DelayManager.realisticDelay();
const client = new ApiClient('http://localhost:8100');
```

## 🤝 Contributing

1. Follow the existing code structure and patterns
2. Add comprehensive tests for new components
3. Update this README for significant changes
4. Use TypeScript strict mode
5. Follow the established naming conventions

## 📄 License

Part of the Online Shopping Store project.