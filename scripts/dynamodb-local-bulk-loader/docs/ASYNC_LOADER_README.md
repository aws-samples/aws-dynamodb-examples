# Async Python DynamoDB Loader

High-throughput CSV to DynamoDB loader using Python's asyncio and aioboto3.

## Overview

The async loader provides good performance for most use cases by leveraging Python's async/await syntax and non-blocking I/O. Auto-configured with 10 workers.

## Key Features

- **Auto-tuning**: Automatically uses 10 workers (from performance testing)
- **Non-blocking I/O**: High throughput with minimal CPU usage
- **Connection Pooling**: Prevents boto3 bottlenecks
- **Automatic Retry**: Exponential backoff with jitter for transient errors
- **Hot Partition Avoidance**: Shuffles data before writing

## When to Use

Use async loader when:
- Loading datasets up to 1-2M records
- You want good performance with simplicity
- Your application uses asyncio
- You need efficient resource usage
- Deploying to serverless environments

For datasets > 10M records, use [AWS DynamoDB Bulk Executor](https://github.com/awslabs/amazon-dynamodb-tools/tree/main/tools/bulk_executor).

## Installation

```bash
# Install dependencies
uv sync

# Or install specific dependencies
uv pip install aioboto3 boto3
```

## Quick Start

### Command Line

```bash
# Basic usage
uv run python async_loader_cli.py \
    --csv data.csv \
    --table my-table \
    --region us-east-1

# With custom configuration
uv run python async_loader_cli.py \
    --csv data.csv \
    --table my-table \
    --region us-east-1 \
    --workers 20 \
    --batch-size 25 \
    --max-retries 3
```

### Programmatic Usage

```python
import asyncio
from src.async_loader import AsyncDynamoDBLoader

async def main():
    # Create loader instance
    loader = AsyncDynamoDBLoader(
        table_name="my-table",
        region="us-east-1",
        max_workers=20,      # Concurrent async tasks
        batch_size=25,       # Items per batch (max 25)
        max_retries=3        # Retry attempts
    )
    
    # Load CSV file
    result = await loader.load_csv("data.csv")
    
    # Check results
    print(f"Total records: {result.total_records}")
    print(f"Successful writes: {result.successful_writes}")
    print(f"Failed writes: {result.failed_writes}")
    print(f"Success rate: {result.success_rate():.2f}%")
    print(f"Duration: {result.duration_seconds:.2f}s")
    
    # Handle errors
    if result.errors:
        print(f"\nErrors encountered:")
        for error in result.errors:
            print(f"  - {error}")

# Run async function
asyncio.run(main())
```

## Configuration Options

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `table_name` | str | Required | DynamoDB table name |
| `region` | str | `us-east-1` | AWS region |
| `max_workers` | int | `10` (auto) | Number of concurrent async tasks |
| `batch_size` | int | `25` | Records per batch (max 25) |
| `max_retries` | int | `3` | Maximum retry attempts |
| `base_delay` | float | `0.1` | Base delay for exponential backoff (seconds) |
| `max_delay` | float | `10.0` | Maximum delay between retries (seconds) |

**Auto-configuration**: Defaults to 10 workers (optimal from performance testing). Can be overridden by setting `max_workers` explicitly.

## Performance Tuning

### Worker Count

The `max_workers` parameter controls how many batches are processed concurrently:

```python
# Conservative (good for limited DynamoDB capacity)
loader = AsyncDynamoDBLoader(max_workers=10)

# Aggressive (requires higher DynamoDB capacity)
loader = AsyncDynamoDBLoader(max_workers=50)

# Recommended for most cases
loader = AsyncDynamoDBLoader(max_workers=20)
```

**Guidelines:**
- Default 10 workers (from performance testing)
- Increase to 15-20 if you see low CPU/network utilization
- Decrease if you hit DynamoDB throttling
- Async workers are lightweight (not OS threads)
- Performance degrades beyond 10 workers due to event loop overhead

### Batch Size

Always use batch size 25 for better performance:

```python
# ✅ GOOD: Higher efficiency
loader = AsyncDynamoDBLoader(batch_size=25)

# ❌ BAD: Inefficient (more API calls)
loader = AsyncDynamoDBLoader(batch_size=1)
```

### Retry Configuration

Tune retry behavior based on your DynamoDB capacity:

```python
# High capacity (fast retries)
loader = AsyncDynamoDBLoader(
    max_retries=3,
    base_delay=0.1,
    max_delay=5.0
)

# Limited capacity (slower retries to avoid throttling)
loader = AsyncDynamoDBLoader(
    max_retries=5,
    base_delay=0.5,
    max_delay=30.0
)
```

## How It Works

### 1. Read CSV

```python
records = self._read_csv(csv_file)
```

Reads entire CSV file into memory. For files > 1M records, consider using [AWS DynamoDB Bulk Executor](https://github.com/awslabs/amazon-dynamodb-tools/tree/main/tools/bulk_executor).

### 2. Shuffle Records

```python
random.shuffle(records)
```

**Critical step** to prevent hot partitions. Without shuffling, sequential writes to sorted data (e.g., by timestamp) would target the same partition, causing throttling.

### 3. Create Batches

```python
batches = self._create_batches(records)
```

Splits records into batches of `batch_size` (max 25 for DynamoDB BatchWriteItem).

### 4. Process Concurrently

```python
semaphore = asyncio.Semaphore(max_workers)

async def process_batch_with_semaphore(batch_id, batch):
    async with semaphore:
        return await self._write_batch(table, batch_id, batch)

tasks = [process_batch_with_semaphore(i, batch) for i, batch in enumerate(batches)]
results = await asyncio.gather(*tasks, return_exceptions=True)
```

Uses semaphore to limit concurrent operations while processing all batches in parallel.

### 5. Write with Retry

```python
async with table.batch_writer() as batch:
    for item in items:
        await batch.put_item(Item=item)
```

Uses aioboto3's batch_writer with automatic retry logic from RetryHandler.

## Error Handling

### Transient Errors (Retried)

- `ProvisionedThroughputExceededException` - DynamoDB throttling
- `ServiceUnavailable` - Temporary service issues
- Network timeouts
- Connection errors

### Permanent Errors (Not Retried)

- `ValidationException` - Invalid data format
- `ResourceNotFoundException` - Table doesn't exist
- `AccessDeniedException` - Insufficient permissions

### Error Isolation

Failed batches don't stop other batches from processing. The loader continues and reports all errors at the end.

## Examples

### Basic Load

```python
import asyncio
from src.async_loader import AsyncDynamoDBLoader

async def load_data():
    loader = AsyncDynamoDBLoader(
        table_name="users",
        region="us-east-1"
    )
    result = await loader.load_csv("users.csv")
    print(f"Loaded {result.successful_writes} records")

asyncio.run(load_data())
```

### With Error Handling

```python
import asyncio
from src.async_loader import AsyncDynamoDBLoader

async def load_with_error_handling():
    loader = AsyncDynamoDBLoader(
        table_name="users",
        region="us-east-1",
        max_workers=20,
        max_retries=5
    )
    
    try:
        result = await loader.load_csv("users.csv")
        
        if result.failed_writes > 0:
            print(f"Warning: {result.failed_writes} records failed")
            print("Errors:")
            for error in result.errors:
                print(f"  - {error}")
        else:
            print(f"Success! Loaded {result.successful_writes} records")
            
    except Exception as e:
        print(f"Fatal error: {e}")

asyncio.run(load_with_error_handling())
```

### Integration with Existing Async Code

```python
import asyncio
from src.async_loader import AsyncDynamoDBLoader

async def process_multiple_files():
    loader = AsyncDynamoDBLoader(
        table_name="events",
        region="us-east-1"
    )
    
    # Load multiple files concurrently
    files = ["events_2024_01.csv", "events_2024_02.csv", "events_2024_03.csv"]
    
    tasks = [loader.load_csv(file) for file in files]
    results = await asyncio.gather(*tasks)
    
    total_records = sum(r.successful_writes for r in results)
    print(f"Loaded {total_records} total records from {len(files)} files")

asyncio.run(process_multiple_files())
```

## Troubleshooting

### High Memory Usage

**Problem**: Loading large CSV files consumes too much memory

**Solution**: 
- Use Spark loader for files > 1M records
- Process files in chunks
- Increase available system memory

### Throttling Errors

**Problem**: Frequent `ProvisionedThroughputExceededException`

**Solution**:
- Reduce `max_workers` to slow down request rate
- Increase DynamoDB table capacity
- Increase `base_delay` for longer backoff periods
- Switch to on-demand billing mode

### Slow Performance

**Problem**: Loading takes longer than expected

**Solution**:
- Increase `max_workers` for more parallelism
- Verify DynamoDB capacity is sufficient
- Check network latency to AWS region
- Ensure batch_size is set to 25

### Connection Errors

**Problem**: Frequent connection timeouts or errors

**Solution**:
- Check AWS credentials are valid
- Verify network connectivity to AWS
- Increase retry configuration
- Check security group and network ACL rules

## Comparison with Threaded Loader

| Feature | Async Loader | Threaded Loader |
|---------|--------------|-----------------|
| Use case | Simplicity, serverless | High throughput |
| Default workers | 10 | CPU cores (auto-detect) |
| Throughput (1M records) | 4,129 rec/s | 4,938 rec/s |
| Resource usage | Low | Medium |
| Programming model | Asynchronous | Synchronous |
| Scalability | Good | Good for large datasets |

## Additional Resources

- [Main README](../README.md) - Project overview
- [Threaded Loader README](THREADED_LOADER_README.md) - Multi-threaded implementation
- [RESULTS.md](../RESULTS.md) - Performance benchmarks
- [AWS DynamoDB Bulk Executor](https://github.com/awslabs/amazon-dynamodb-tools/tree/main/tools/bulk_executor) - For > 10M records
- [Python asyncio Documentation](https://docs.python.org/3/library/asyncio.html)
- [aioboto3 Documentation](https://aioboto3.readthedocs.io/)

