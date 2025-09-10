# DynamoDB Local Setup Guide

This guide explains how to set up and use DynamoDB Local for development and testing alongside your existing MySQL database.

## Overview

DynamoDB Local is a downloadable version of Amazon DynamoDB that runs locally for development and testing. It allows you to develop and test applications without connecting to the actual DynamoDB service.

## Prerequisites

- Docker installed and running
- Node.js (for setup scripts)
- Existing MySQL database (running locally)

## Quick Start

### 1. Start DynamoDB Local

```bash
# From the project root
./backend/scripts/setup-dynamodb-local.sh start
```

### 2. Verify Setup

```bash
# Check status
./backend/scripts/setup-dynamodb-local.sh status
```

### 3. Stop DynamoDB Local

```bash
# Stop when done
./backend/scripts/setup-dynamodb-local.sh stop
```

## Available Commands

| Command | Description |
|---------|-------------|
| `start` | Start DynamoDB Local container |
| `stop` | Stop DynamoDB Local container |
| `restart` | Restart DynamoDB Local container |
| `reset` | Reset DynamoDB Local (removes all data) |
| `status` | Check if DynamoDB Local is running |

## Configuration

### Connection Details

- **Endpoint**: http://localhost:8000
- **Region**: us-east-1 (default)
- **Access Key**: test (for local development)
- **Secret Key**: test (for local development)

### Environment Variables

The application automatically detects DynamoDB Local when running on localhost:8000. No additional environment variables are required for basic setup.

## Database Coexistence

### MySQL + DynamoDB Local

Both databases can run simultaneously:

- **MySQL**: Runs locally (default port 3306)
- **DynamoDB Local**: Runs in Docker (port 8000)
- **No conflicts**: Different ports and protocols

### Switching Between Databases

The application uses a factory pattern to switch between databases:

```typescript
// Initialize for MySQL
DatabaseFactory.initialize('mysql');

// Initialize for DynamoDB
DatabaseFactory.initialize('dynamodb');
```

## Table Management

### Automatic Table Creation

Tables are created automatically by the repository implementations when first accessed. No manual table creation is required.

### Supported Tables

The following tables are automatically created based on the migration contract:

- `users` - User accounts and authentication
- `products` - Product catalog
- `orders` - Order management
- `categories` - Product categories
- `shopping_carts` - Shopping cart data

## Testing

### Running Tests with DynamoDB Local

```bash
# Start DynamoDB Local first
./backend/scripts/setup-dynamodb-local.sh start

# Run integration tests
cd backend
npm run test:integration

# Run all tests
npm run test:all
```

### Test Database Isolation

- Unit tests: Use mocked data (no database)
- Integration tests: Use real DynamoDB Local
- E2E tests: Use real DynamoDB Local

## Troubleshooting

### Common Issues

#### 1. Container Already Running

```
[WARNING] DynamoDB Local is already running
```

**Solution**: This is normal. DynamoDB Local is already available.

#### 2. Docker Not Found

```
[ERROR] Docker is not installed or not in PATH
```

**Solution**: Install Docker and ensure it's in your PATH.

#### 3. Connection Refused

```
Error connecting to DynamoDB Local: connect ECONNREFUSED
```

**Solutions**:
- Ensure Docker is running
- Wait a few seconds after starting (container needs time to initialize)
- Check if port 8000 is available

#### 4. Permission Denied

```
Permission denied: ./backend/scripts/setup-dynamodb-local.sh
```

**Solution**: Make the script executable:
```bash
chmod +x ./backend/scripts/setup-dynamodb-local.sh
```

### Data Persistence

- **Development**: Data persists between container restarts
- **Testing**: Use `reset` command to clear data between test runs
- **Data Location**: `docker/dynamodb/` directory

### Performance Considerations

- DynamoDB Local is slower than production DynamoDB
- Suitable for development and testing only
- Not recommended for production workloads

## Integration with Feature Flags

Once the feature flag system is implemented, you can:

1. **Dual-write mode**: Write to both MySQL and DynamoDB Local
2. **Dual-read mode**: Read from both databases and validate consistency
3. **Migration phases**: Gradually transition from MySQL to DynamoDB Local

## Advanced Usage

### Manual Table Operations

If you need to manually inspect or modify tables:

```bash
# Install AWS CLI (optional)
pip install awscli-local

# List tables
aws --endpoint-url=http://localhost:8000 dynamodb list-tables

# Describe table
aws --endpoint-url=http://localhost:8000 dynamodb describe-table --table-name users
```

### Custom Configuration

To modify DynamoDB Local settings, edit `docker/docker-compose.yml`:

```yaml
services:
  dynamodb-local:
    command: "-jar DynamoDBLocal.jar -sharedDb -dbPath ./data -port 8000"
    # Add additional flags as needed
```

## Next Steps

1. **Feature Flags**: Implement feature flag system for database switching
2. **Dual-write**: Enable writing to both MySQL and DynamoDB Local
3. **Migration**: Use DynamoDB Local to test migration scenarios
4. **Production**: Deploy to actual DynamoDB when ready

## Support

For issues specific to DynamoDB Local, refer to:
- [AWS DynamoDB Local Documentation](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.html)
- [DynamoDB Local Docker Image](https://hub.docker.com/r/amazon/dynamodb-local)
