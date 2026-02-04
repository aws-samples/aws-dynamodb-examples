# Multi-threaded Python DynamoDB Loader

High-performance CSV to DynamoDB loader using Python's threading and boto3.

## Overview

The threaded loader provides high throughput by auto-detecting CPU cores and mapping threads to cores. Suitable for workloads requiring high performance.

## Key Features

- **Auto-tuning**: Automatically detects CPU cores
- **High Throughput**: 4,938 rec/s (19.5% faster than async)
- **Connection Pooling**: Prevents boto3 bottlenecks
- **Thread-safe Operations**: Proper locking and boto3 thread safety
- **Automatic Retry**: Exponential backoff with jitter for transient errors
- **Hot Partition Avoidance**: Shuffles data before writing

## When to Use

Use threaded loader when:
- You want high throughput
- Loading datasets from 100K to 2M records
- Your codebase is synchronous
- You prefer traditional threading over async

For datasets > 10M records, use [AWS DynamoDB Bulk Executor](https://github.com/awslabs/amazon-dynamodb-tools/tree/main/tools/bulk_executor).

## Installation

```bash
# Install dependencies
uv sync

# Or install specific dependencies
uv pip install boto3
```

## Quick Start

### Command Line

```bash
# Basic usage
uv run python threaded_loader_cli.py \
    --csv data.csv \
    --table my-table \
    --region us-east-1

# With custom configuration
uv run python threaded_loader_cli.py \
    --csv data.csv \
    --table my-table \
    --region us-east-1 \
    --workers 10 \
    --batch-size 25 \
    --max-retries 3
```

### Programmatic Usage

```python
from src.threaded_loader import ThreadedDynamoDBLoader

def main():
    # Create loader instance
    loader = ThreadedDynamoDBLoader(
        table_name="my-table",
        region="us-east-1",
        max_workers=10,      # Number of worker threads
        batch_size=25,       # Items per batch (max 25)
        max_retries=3        # Retry attempts
    )
    
    # Load CSV file
    result = loader.load_csv("data.csv")
    
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

if __name__ == "__main__":
    main()
```

## Configuration Options

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `table_name` | str | Required | DynamoDB table name |
| `region` | str | `us-east-1` | AWS region |
| `max_workers` | int | CPU cores (auto) | Number of worker threads |
| `batch_size` | int | `25` | Records per batch (max 25) |
| `max_retries` | int | `3` | Maximum retry attempts |
| `base_delay` | float | `0.1` | Base delay for exponential backoff (seconds) |
| `max_delay` | float | `10.0` | Maximum delay between retries (seconds) |

**Auto-configuration**: Defaults to `os.cpu_count()` for optimal thread-to-core mapping. Performance testing showed 21.8% improvement when workers match CPU cores.

## Performance Tuning

### Worker Count

The `max_workers` parameter controls the thread pool size:

```python
# Auto-detect CPU cores (recommended)
loader = ThreadedDynamoDBLoader()

# Conservative (good for limited DynamoDB capacity)
loader = ThreadedDynamoDBLoader(max_workers=5)

# Aggressive (requires higher DynamoDB capacity)
loader = ThreadedDynamoDBLoader(max_workers=20)
```

**Guidelines:**
- Default auto-detection matches CPU cores
- Performance testing: 14 workers = 4,938 rec/s, 10 workers = 3,862 rec/s (21.8% slower)
- Decrease if you hit DynamoDB throttling
- OS threads have more overhead than async tasks

### Batch Size

Always use batch size 25 for better performance:

```python
# ✅ GOOD: Higher efficiency
loader = ThreadedDynamoDBLoader(batch_size=25)

# ❌ BAD: Inefficient (more API calls)
loader = ThreadedDynamoDBLoader(batch_size=1)
```

### Retry Configuration

Tune retry behavior based on your DynamoDB capacity:

```python
# High capacity (fast retries)
loader = ThreadedDynamoDBLoader(
    max_retries=3,
    base_delay=0.1,
    max_delay=5.0
)

# Limited capacity (slower retries to avoid throttling)
loader = ThreadedDynamoDBLoader(
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

### 4. Process with Thread Pool

```python
with ThreadPoolExecutor(max_workers=self.config.max_workers) as executor:
    future_to_batch = {
        executor.submit(self._write_batch, table, i, batch): (i, batch)
        for i, batch in enumerate(batches)
    }
    
    for future in as_completed(future_to_batch):
        result = future.result()
        # Process result...
```

Uses ThreadPoolExecutor to manage worker threads and process batches concurrently.

### 5. Write with Retry (Thread-safe)

```python
with table.batch_writer() as batch:
    for item in items:
        batch.put_item(Item=item)
```

Uses boto3's thread-safe batch_writer with automatic retry logic from RetryHandler.

## Thread Safety

The threaded loader is designed to be thread-safe:

- **boto3 batch_writer**: Thread-safe by design
- **boto3 resources**: Each thread gets its own client from the resource
- **Result aggregation**: Uses thread-safe operations
- **No shared mutable state**: Each thread operates independently

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
from src.threaded_loader import ThreadedDynamoDBLoader

def load_data():
    loader = ThreadedDynamoDBLoader(
        table_name="users",
        region="us-east-1"
    )
    result = loader.load_csv("users.csv")
    print(f"Loaded {result.successful_writes} records")

if __name__ == "__main__":
    load_data()
```

### With Error Handling

```python
from src.threaded_loader import ThreadedDynamoDBLoader

def load_with_error_handling():
    loader = ThreadedDynamoDBLoader(
        table_name="users",
        region="us-east-1",
        max_workers=10,
        max_retries=5
    )
    
    try:
        result = loader.load_csv("users.csv")
        
        if result.failed_writes > 0:
            print(f"Warning: {result.failed_writes} records failed")
            print("Errors:")
            for error in result.errors:
                print(f"  - {error}")
        else:
            print(f"Success! Loaded {result.successful_writes} records")
            
    except Exception as e:
        print(f"Fatal error: {e}")

if __name__ == "__main__":
    load_with_error_handling()
```

### Processing Multiple Files

```python
from src.threaded_loader import ThreadedDynamoDBLoader
from concurrent.futures import ThreadPoolExecutor, as_completed

def load_file(filename):
    loader = ThreadedDynamoDBLoader(
        table_name="events",
        region="us-east-1"
    )
    return loader.load_csv(filename)

def process_multiple_files():
    files = ["events_2024_01.csv", "events_2024_02.csv", "events_2024_03.csv"]
    
    # Process files in parallel
    with ThreadPoolExecutor(max_workers=3) as executor:
        future_to_file = {
            executor.submit(load_file, file): file 
            for file in files
        }
        
        total_records = 0
        for future in as_completed(future_to_file):
            file = future_to_file[future]
            try:
                result = future.result()
                total_records += result.successful_writes
                print(f"Loaded {result.successful_writes} records from {file}")
            except Exception as e:
                print(f"Error loading {file}: {e}")
        
        print(f"Total: {total_records} records from {len(files)} files")

if __name__ == "__main__":
    process_multiple_files()
```

### With Custom Preprocessing

```python
from src.threaded_loader import ThreadedDynamoDBLoader
import csv

def preprocess_record(record):
    """Custom preprocessing logic."""
    # Convert strings to appropriate types
    record['amount'] = float(record['amount'])
    # Add computed fields
    record['processed_at'] = datetime.now().isoformat()
    return record

def load_with_preprocessing():
    # Read and preprocess CSV
    records = []
    with open("data.csv", "r") as f:
        reader = csv.DictReader(f)
        for row in reader:
            processed = preprocess_record(row)
            records.append(processed)
    
    # Write preprocessed CSV
    with open("preprocessed.csv", "w") as f:
        writer = csv.DictWriter(f, fieldnames=records[0].keys())
        writer.writeheader()
        writer.writerows(records)
    
    # Load with threaded loader
    loader = ThreadedDynamoDBLoader(
        table_name="users",
        region="us-east-1"
    )
    result = loader.load_csv("preprocessed.csv")
    print(f"Loaded {result.successful_writes} records")

if __name__ == "__main__":
    load_with_preprocessing()
```

## Troubleshooting

### High Memory Usage

**Problem**: Loading large CSV files consumes too much memory

**Solution**: 
- Use Spark loader for files > 500K records
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
- Increase `max_workers` for more parallelism (but not too high)
- Verify DynamoDB capacity is sufficient
- Check network latency to AWS region
- Ensure batch_size is set to 25
- Consider using async loader for better throughput

### Thread Exhaustion

**Problem**: Too many threads causing system issues

**Solution**:
- Reduce `max_workers` to a reasonable number (10-20)
- Monitor system resources (CPU, memory)
- Default auto-detection should prevent this issue

## Comparison with Async Loader

| Feature | Threaded Loader | Async Loader |
|---------|-----------------|--------------|
| Throughput focus | High | Moderate |
| Default workers | CPU cores (auto-detect) | 10 |
| Throughput (1M records) | 4,938 rec/s | 4,129 rec/s |
| Resource usage | Medium | Low |
| Programming model | Synchronous | Asynchronous |
| Scalability | Good for large datasets | Good |

## Additional Resources

- [Main README](../README.md) - Project overview
- [Async Loader README](ASYNC_LOADER_README.md) - Async implementation
- [RESULTS.md](../RESULTS.md) - Performance benchmarks
- [AWS DynamoDB Bulk Executor](https://github.com/awslabs/amazon-dynamodb-tools/tree/main/tools/bulk_executor) - For > 10M records
- [Python threading Documentation](https://docs.python.org/3/library/threading.html)
- [boto3 Documentation](https://boto3.amazonaws.com/v1/documentation/api/latest/index.html)

