# DynamoDB Local Bulk Loader

Bulk load CSV data into DynamoDB from your local machine or EC2. Two Python implementations with automatic performance tuning.

## When to Use This Tool

**Local Python execution for small to medium datasets:**
- Loading from local CSV files or EC2 instances
- Datasets up to 1-2M records
- Development and testing workflows
- Simple deployment without Glue cluster

**For large-scale distributed processing (> 10M records):**
- Use [AWS DynamoDB Bulk Executor](https://github.com/awslabs/amazon-dynamodb-tools/tree/main/tools/bulk_executor) spark-based with advanced operations (count, find, update, delete, diff, SQL)

## Quick Start

```bash
# Install dependencies
uv sync

# Install with dev dependencies (for testing)
uv sync --all-extras

# Generate test data
uv run python generate_csv.py --output sample_10k.csv --count 10000

# Create table
aws dynamodb create-table \
    --table-name my-test-table \
    --attribute-definitions AttributeName=id,AttributeType=S \
    --key-schema AttributeName=id,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST

# Load data (auto-detects optimal settings)
uv run python threaded_loader_cli.py --csv sample_10k.csv --table my-test-table
```

## Implementation Approaches

### Threaded Loader

High throughput for multicore environments.

- Auto-detects CPU cores
- 4,938 records/second (tested with 14 cores, 40K WCU)
- 19.5% faster than async loader

```bash
# Auto-detect settings
uv run python threaded_loader_cli.py --csv data.csv --table my-table

# Customize if needed
uv run python threaded_loader_cli.py --csv data.csv --table my-table --workers 20
```

**Programmatic usage:**
```python
from src.threaded_loader import ThreadedDynamoDBLoader

loader = ThreadedDynamoDBLoader(table_name="my-table", region="us-east-1")
result = loader.load_csv("data.csv")
print(f"Loaded {result.successful_writes:,} records in {result.duration_seconds:.2f}s")
```

### Async Loader

Simpler implementation for serverless environments.

- Defaults to 10 workers
- 4,129 records/second (tested with 40K WCU)
- Simpler code, easier to debug

```bash
# Auto-detect settings
uv run python async_loader_cli.py --csv data.csv --table my-table

# Customize if needed
uv run python async_loader_cli.py --csv data.csv --table my-table --workers 15
```

**Programmatic usage:**
```python
import asyncio
from src.async_loader import AsyncDynamoDBLoader

async def main():
    loader = AsyncDynamoDBLoader(table_name="my-table", region="us-east-1")
    result = await loader.load_csv("data.csv")
    print(f"Loaded {result.successful_writes:,} records in {result.duration_seconds:.2f}s")

asyncio.run(main())
```

## Key Features

- **Auto-tuning**: Automatically configures worker count
- **Hot partition avoidance**: Shuffles records before writing
- **Connection pooling**: Prevents boto3 bottlenecks
- **Retry logic**: Exponential backoff with jitter
- **Testing**: Type hints, unit tests, property-based tests

## Configuration

| Parameter | Default | Description |
|-----------|---------|-------------|
| `--csv` | Required | Path to CSV file |
| `--table` | Required | DynamoDB table name |
| `--region` | `us-east-1` | AWS region |
| `--workers` | Auto-detect | Async: 10, Threaded: CPU cores |
| `--batch-size` | `25` | Records per batch (max 25) |
| `--max-retries` | `3` | Retry attempts for failures |

## Performance

See [RESULTS.md](RESULTS.md) for detailed benchmarks.

**Summary (1M records, 40K WCU):**
- Threaded (14 workers): 202.53s (4,938 rec/s)
- Async (10 workers): 242.20s (4,129 rec/s)

## How It Works

1. Read CSV into memory
2. Shuffle records to prevent hot partitions
3. Split into batches of 25 (DynamoDB limit)
4. Process batches concurrently with retry logic
5. Return statistics and errors

## Testing

```bash
# Install dev dependencies first
uv sync --all-extras

# Run all tests
uv run pytest

# Run with coverage
uv run pytest --cov=src --cov-report=html
```

## Troubleshooting

**Throttling errors:**
- Increase DynamoDB capacity
- Reduce `--workers` to slow down writes

**Slow performance:**
- Verify DynamoDB has adequate capacity (40K+ WCU for large loads)
- Use threaded loader with auto-detected workers
- Run from EC2 in same region as DynamoDB

**Memory issues:**
- Process smaller files (< 1M records)
- Use AWS DynamoDB Bulk Executor for very large datasets

## Additional Documentation

- [RESULTS.md](RESULTS.md) - Performance benchmarks and comparisons
- [docs/ASYNC_LOADER_README.md](docs/ASYNC_LOADER_README.md) - Async loader details
- [docs/THREADED_LOADER_README.md](docs/THREADED_LOADER_README.md) - Threaded loader details
- [AWS DynamoDB Bulk Executor](https://github.com/awslabs/amazon-dynamodb-tools/tree/main/tools/bulk_executor) - For large-scale distributed processing
