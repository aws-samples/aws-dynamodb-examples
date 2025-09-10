#!/bin/bash

# DynamoDB Local Setup Script
# This script manages DynamoDB Local for development and testing

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DOCKER_DIR="$PROJECT_ROOT/docker"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to start DynamoDB Local
start_dynamodb() {
    print_status "Starting DynamoDB Local..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed or not in PATH"
        exit 1
    fi
    
    cd "$DOCKER_DIR"
    
    # Check if container is already running
    if docker ps | grep -q "dynamodb-local"; then
        print_warning "DynamoDB Local is already running"
        return 0
    fi
    
    # Start DynamoDB Local
    docker-compose up -d dynamodb-local
    
    # Wait for DynamoDB Local to be ready
    print_status "Waiting for DynamoDB Local to be ready..."
    sleep 5
    
    # Verify connection
    node "$SCRIPT_DIR/setup-dynamodb-local.js"
    
    print_success "DynamoDB Local is running on http://localhost:8000"
}

# Function to stop DynamoDB Local
stop_dynamodb() {
    print_status "Stopping DynamoDB Local..."
    
    cd "$DOCKER_DIR"
    docker-compose down
    
    print_success "DynamoDB Local stopped"
}

# Function to reset DynamoDB Local (stop, remove data, start)
reset_dynamodb() {
    print_status "Resetting DynamoDB Local..."
    
    cd "$DOCKER_DIR"
    docker-compose down
    
    # Remove data directory if it exists
    if [ -d "$DOCKER_DIR/dynamodb" ]; then
        rm -rf "$DOCKER_DIR/dynamodb"
        print_status "Removed existing DynamoDB data"
    fi
    
    # Start fresh
    start_dynamodb
    
    print_success "DynamoDB Local reset complete"
}

# Function to check status
status_dynamodb() {
    print_status "Checking DynamoDB Local status..."
    
    if docker ps | grep -q "dynamodb-local"; then
        print_success "DynamoDB Local is running"
        node "$SCRIPT_DIR/setup-dynamodb-local.js"
    else
        print_warning "DynamoDB Local is not running"
        echo "Run: $0 start"
    fi
}

# Main script logic
case "${1:-}" in
    start)
        start_dynamodb
        ;;
    stop)
        stop_dynamodb
        ;;
    restart)
        stop_dynamodb
        start_dynamodb
        ;;
    reset)
        reset_dynamodb
        ;;
    status)
        status_dynamodb
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|reset|status}"
        echo ""
        echo "Commands:"
        echo "  start   - Start DynamoDB Local"
        echo "  stop    - Stop DynamoDB Local"
        echo "  restart - Restart DynamoDB Local"
        echo "  reset   - Reset DynamoDB Local (removes all data)"
        echo "  status  - Check DynamoDB Local status"
        echo ""
        echo "DynamoDB Local will be available at: http://localhost:8000"
        exit 1
        ;;
esac
