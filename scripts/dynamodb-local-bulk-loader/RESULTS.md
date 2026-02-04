# DynamoDB Local Bulk Loader - Performance Test Results

This document contains performance benchmarks for the two local Python loading approaches implemented in this project.

**Note**: For large-scale distributed processing (> 10M records), see [AWS DynamoDB Bulk Executor](https://github.com/awslabs/amazon-dynamodb-tools/tree/main/tools/bulk_executor) which uses Spark/Glue for massive parallel execution.

## Test Environment

- **Region**: us-east-1
- **Test Date**: February 3, 2026
- **Hardware**: 14 CPU cores (7 physical cores with hyperthreading)
- **DynamoDB Capacity**: On demand table - Warm throughput to 40,000 WCU.

## Test Datasets

- **sample_100.csv**: 100 records
- **sample_10k.csv**: 10,000 records
- **sample_1m.csv**: 1,000,000 records

---

## 1. Async Loader Results

### Configuration
- **Workers**: 10 (optimal), 14, 20 (tested)
- **Batch Size**: 25
- **Max Retries**: 3

### Test Results

#### 10K Records Test
```
CSV File:      sample_10k.csv
Table:         my-10k-test-table
Region:        us-east-1
Workers:       10
Batch Size:    25

Results:
- Total Records:     10,000
- Successful Writes: 10,000
- Failed Writes:     0
- Success Rate:      100.00%
- Duration:          3.81 seconds (initial), 3.82 seconds (with 40K WCU)
- Throughput:        2,625 records/second
```

#### 100 Records Test
```
[Not tested - focus on larger datasets]
```

#### 1M Records Test - Worker Count Comparison

**10 Workers (Optimal):**
```
- Total Records:     1,000,000
- Successful Writes: 1,000,000
- Failed Writes:     0
- Success Rate:      100.00%
- Duration:          242.20 seconds (4 min 2 sec)
- Throughput:        4,129 records/second
```

**14 Workers:**
```
- Duration:          254.37 seconds (4 min 14 sec)
- Throughput:        3,931 records/second
- vs 10 workers:     -5.0% slower
```

**20 Workers:**
```
- Duration:          245.82 seconds (4 min 6 sec)
- Throughput:        4,069 records/second
- vs 10 workers:     -1.5% slower
```

### Observations
- 100% success rate across all dataset sizes
- Configuration: 10 workers (independent of CPU core count)
- Adding more workers increases event loop overhead without improving throughput
- Throughput improves with larger datasets due to better batching efficiency
- Benefits from higher DynamoDB capacity (7.6% improvement with 40K WCU for 1M records)
- Event loop-based concurrency doesn't scale linearly with worker count

---

## 2. Threaded Loader Results

### Configuration
- **Workers**: 10, 14 (optimal - matches CPU cores)
- **Batch Size**: 25
- **Max Retries**: 3

### Test Results

#### 10K Records Test
```
CSV File:      sample_10k.csv
Table:         my-10k-test-table
Region:        us-east-1
Workers:       10
Batch Size:    25

Results:
- Total Records:     10,000
- Successful Writes: 10,000
- Failed Writes:     0
- Success Rate:      100.00%
- Duration:          4.54 seconds (initial), 5.03 seconds (with 40K WCU)
- Throughput:        2,203 records/second
```

#### 100 Records Test
```
[Not tested - focus on larger datasets]
```

#### 1M Records Test - Worker Count Comparison

**10 Workers:**
```
- Total Records:     1,000,000
- Successful Writes: 1,000,000
- Failed Writes:     0
- Success Rate:      100.00%
- Duration:          258.94 seconds (4 min 19 sec)
- Throughput:        3,862 records/second
```

**14 Workers (Optimal - Matches CPU Cores):**
```
- Total Records:     1,000,000
- Successful Writes: 1,000,000
- Failed Writes:     0
- Success Rate:      100.00%
- Duration:          202.53 seconds (3 min 23 sec)
- Throughput:        4,938 records/second
- vs 10 workers:     +21.8% faster
- vs async (10w):    +19.5% faster
```

### Observations
- 100% success rate
- Configuration: 14 workers (matching CPU core count)
- 21.8% improvement when workers match CPU cores (10 → 14 workers)
- Thread-to-core mapping reduces context switching overhead
- Performance: 4,938 rec/s for 1M records
---

## Performance Comparison

### 10K Records

| Loader Type | Duration | Throughput (rec/sec) | Success Rate | Failed Writes |
|-------------|----------|---------------------|--------------|---------------|
| Async       | 3.81s    | 2,625               | 100.00%      | 0             |
| Threaded    | 4.54s    | 2,203               | 100.00%      | 0             |

**Winner: Async** (16% faster for small datasets)

### 1M Records (40K WCU)

| Loader Type | Workers | Duration | Throughput (rec/sec) | Success Rate | Failed Writes |
|-------------|---------|----------|---------------------|--------------|---------------|
| Threaded    | 14      | 202.53s  | 4,938               | 100.00%      | 0             |
| Async       | 10      | 242.20s  | 4,129               | 100.00%      | 0             |
| Async       | 20      | 245.82s  | 4,069               | 100.00%      | 0             |
| Async       | 14      | 254.37s  | 3,931               | 100.00%      | 0             |
| Threaded    | 10      | 258.94s  | 3,862               | 100.00%      | 0             |

**Winner: Threaded with 14 workers** (19.5% faster than best async configuration)

---

## Recommendations

### When to Use Each Tool

#### This Tool (Local Python Loaders)
For datasets < 2M records, local development, EC2 instances

**Threaded Loader** (High Throughput):
- Auto-detects CPU cores
- 4,938 rec/s for 1M records

**Async Loader** (Simplicity):
- Uses 10 workers
- 4,129 rec/s for 1M records

#### AWS DynamoDB Bulk Executor
For datasets > 10M records, complex operations

- Spark/Glue distributed processing
- Advanced operations: count, find, update, delete, diff, SQL
- ~2 min startup overhead
- Link: https://github.com/awslabs/amazon-dynamodb-tools/tree/main/tools/bulk_executor

---

## Performance Tuning Insights

### Worker Count Optimization

**Key Finding**: Worker count differs by loader type

#### Async Loader
- Configuration: 10 workers (independent of CPU cores)
- Event loop overhead increases with more async tasks
- Performance pattern:
  - 10 workers: 242.20s
  - 14 workers: 254.37s (-5.0%)
  - 20 workers: 245.82s (-1.5%)

#### Threaded Loader
- Configuration: Match CPU core count (14 workers for 14 cores)
- Thread-to-core mapping reduces context switching
- Performance pattern:
  - 10 workers: 258.94s
  - 14 workers: 202.53s (+21.8% improvement)

### DynamoDB Capacity Impact

**Small Datasets (10K records):**
- Client-side processing dominates
- DynamoDB capacity has minimal impact
- Async: 3.81s → 3.82s (no change with 40K WCU)

**Large Datasets (1M records):**
- DynamoDB capacity becomes significant
- Async benefits more from higher capacity
- Async: 262.23s → 242.20s (+7.6% with 40K WCU)
- Threaded: 254.85s → 258.94s (no benefit)

### Bottleneck Analysis

**For datasets < 100K records:**
- Bottleneck: Client-side processing and network latency
- Solution: Use async loader with 10 workers

**For datasets > 100K records:**
- Bottleneck: DynamoDB capacity and concurrent request handling
- Solution: Use threaded loader with workers = CPU cores + adequate DynamoDB capacity

---

## Production Recommendations

### High Throughput Configuration

**Use Threaded Loader with Auto-Detection:**
```bash
# Auto-detects CPU cores (14 on test machine)
python threaded_loader_cli.py \
  --csv your_data.csv \
  --table your-table \
  --region us-east-1
```

**Performance:**
- 4,938 records/second (with 14 CPU cores)
- 1M records in ~3.4 minutes

### Simpler Configuration

**Use Async Loader:**
```bash
# Uses 10 workers
python async_loader_cli.py \
  --csv your_data.csv \
  --table your-table \
  --region us-east-1
```

**Performance:**
- 4,129 records/second
- 1M records in ~4 minutes

### For Very Large Datasets (> 10M records)

**Use AWS DynamoDB Bulk Executor:**
- Spark-based distributed processing
- AWS Glue managed infrastructure
- Advanced operations (count, find, update, delete, diff, SQL)
- Link: https://github.com/awslabs/amazon-dynamodb-tools/tree/main/tools/bulk_executor

---

## Notes

- All tests performed against the same DynamoDB table configuration (40K WCU)
- Hardware: 14 CPU cores (7 physical with hyperthreading)
- Network conditions and DynamoDB throttling may affect results
- Results may vary based on:
  - Hardware specifications (CPU cores, memory)
  - Network latency to DynamoDB region
  - DynamoDB table capacity settings
  - Concurrent workloads on the system
- Both loaders now auto-detect optimal worker count
- Worker count optimization is critical for threaded loader performance
- Async loader performance is more consistent across different worker counts

## Tool Comparison

**This Tool (Local Python):**
- Instant startup
- Simple pip install
- Great for < 2M records
- 4,938 rec/s maximum throughput

**AWS Bulk Executor (Spark/Glue):**
- ~2 minute startup overhead
- Requires Glue bootstrap
- Best for > 10M records
- Advanced operations beyond just loading
- See: https://github.com/awslabs/amazon-dynamodb-tools/tree/main/tools/bulk_executor
