# Write Sharding in DynamoDB

## Overview

Write sharding is a technique used to distribute write operations more evenly across multiple partitions in Amazon DynamoDB. This pattern helps prevent hot partitions and throttling by expanding the partition key space, allowing for better throughput and performance.

## Why Use Write Sharding?

When a DynamoDB table receives a high volume of write operations targeting the same partition key, it can lead to:

1. **Hot partitions**: Uneven distribution of traffic where some partitions receive significantly more requests than others
2. **Throttling**: Requests exceeding the provisioned throughput for a specific partition
3. **Performance degradation**: Slower response times due to partition-level bottlenecks

Write sharding addresses these issues by distributing writes across multiple logical partitions.

## Sharding Techniques

This example demonstrates two common write sharding techniques:

### 1. Random Suffix Sharding

Append a random number to the partition key to distribute items randomly across partitions.

```python
shard_id = random.randint(0, write_shard_count-1)
pk = f'{date}.{str(shard_id)}'
```

**Pros:**
- Simple to implement
- Provides good distribution for write operations

**Cons:**
- Requires querying all shards when reading data
- No predictable way to access a specific item without scanning all shards

### 2. Calculated Suffix Sharding

Use a calculation based on an attribute of the item to determine the shard.

```python
shard_id = int(item_id) % write_shard_count
pk = f'{date}.{str(shard_id)}'
```

**Pros:**
- Deterministic - same item always goes to the same shard
- Can retrieve specific items without querying all shards
- Good for items that need to be accessed individually

**Cons:**
- May still create hot partitions if the calculation doesn't distribute evenly
- Requires knowing the attribute used in the calculation when reading

## Reading from Sharded Tables

When using write sharding, reading data typically requires one of these approaches:

1. **Query all shards**: For random suffix sharding, you need to query each shard and combine the results.

```python
allItems = []
for x in range(write_shard_count):
    pk = f"{date}.{str(x)}"
    resp = table.query(KeyConditionExpression=Key('pk').eq(pk))
    allItems = allItems + resp['Items']
```

2. **Query specific shard**: For calculated suffix sharding, you can query just the shard where the item is stored.

```python
shard_id = int(item_id) % write_shard_count
pk = f"{date}.{str(shard_id)}"
resp = table.query(KeyConditionExpression=Key('pk').eq(pk))
```

## Example Code

The provided Python example demonstrates:
- Writing items using random suffix sharding
- Reading items from all shards with random suffixes
- Writing items using calculated suffix sharding
- Reading items from a specific shard with a calculated suffix

## Running the Example

### Prerequisites

1. Python 3 with the following modules installed:
   - boto3
   - json
   - random
   - argparse

2. DynamoDB table:
   - Table name: "ExampleTable"
   - Partition key: "pk" (String)
   - Sort key: "sk" (String)

3. AWS credentials configured with appropriate permissions

### Execution

```bash
# Run with default settings (us-east-1 region, 2 shards)
python3 python/WriteShardingExample.py

# Run with custom region and shard count
python3 python/WriteShardingExample.py --region us-west-2 --shard-count 4
```

### Command-line Arguments

- `--region`: AWS region name (default: us-east-1)
- `--shard-count`: Number of write shards to use (default: 2)

## Best Practices

1. **Choose an appropriate shard count**: Too few shards won't distribute the load effectively, while too many shards can complicate read operations.

2. **Consider your access patterns**: Choose between random and calculated sharding based on how you'll query the data.

3. **Monitor partition metrics**: Use CloudWatch to monitor partition-level metrics and adjust your sharding strategy as needed.

4. **Combine with other techniques**: Consider using write sharding alongside other DynamoDB best practices like TTL for time-series data or sparse indexes.

## Additional Resources

- [DynamoDB Best Practices for Partition Keys](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-partition-key-design.html)
- [DynamoDB Write Sharding Documentation](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-partition-key-sharding.html)

## Contribute

Contributions to enhance this example are welcome! Please submit a Pull Request with your improvements.
