# Python (boto3) SDK examples for Amazon DynamoDB

This section contains Python code for examples and common tasks with Amazon DynamoDB.

## Working with Items

| All Examples 👉       | Python                                                  |
| --------------------- | ------------------------------------------------------- |
| BatchGet              | [Python](./WorkingWithItems/batch_get.py)               |
| BatchWrite            | [Python](./WorkingWithItems/batch_write.py)             |
| DeleteItem            | Python                                                  |
| DeleteItemConditional | Python                                                  |
| GetItem               | [Python](./WorkingWithItems/get_item.py)                |
| PutItem               | [Python](./WorkingWithItems/put_item.py)                |
| PutItemConditional    | [Python](./WorkingWithItems/put_item_conditional.py)    |
| TransactGet           | Python                                                  |
| TransactWrite         | [Python](./WorkingWithItems/transact_write.py)          |
| UpdateItem            | [Python](./WorkingWithItems/updating_item.py)           |
| UpdateItemConditional | [Python](./WorkingWithItems/update_item_conditional.py) |

## Working with Indexes

| All Examples 👉 | Python |
| --------------- | ------ |
|                 | Python |

## Working with Queries

| All Examples 👉        | Python                                                           |
| ---------------------- | ---------------------------------------------------------------- |
| ConsistentRead         | [Python](./WorkingWithQueries/query-consistent-read.py)          |
| Count                  | [Python](./WorkingWithQueries/query-scan-count.py)               |
| FilterExpression       | [Python](./WorkingWithQueries/query_filter_expression.py)        |
| ProjectionExpression   | [Python](./WorkingWithQueries/query_projection_expression.py)    |
| ReturnConsumedCapacity | [Python](./WorkingWithQueries/query-return-consumed-capacity.py) |

## Working with Scans

| All Examples 👉 | Python |
| --------------- | ------ |
| Simple Scan            | [Python](./WorkingWithScans/scan_simple.py)                |
| Paginate Scan          | [Python](./WorkingWithScans/scan_paginate.py)              |
| Parallel Scan          | [Python](./WorkingWithScans/scan_parallel.py)              |
| Boto3 Paginator Scan   | [Python](./WorkingWithScans/scan_with_paginator.py)        |
| FilterExpression       | [Python](./WorkingWithScans/scan_filter_expression.py)     |
| ProjectionExpression   | [Python](./WorkingWithScans/scan_projection_expression.py) |

## Working with Streams

| All Examples 👉 | Python |
| --------------- | ------ |
|                 | Python |

## Working with Tables

| All Examples 👉                                     | Python                                                       |
| --------------------------------------------------- | ------------------------------------------------------------ |
| Add Global Table Region                             | [Python](./WorkingWithTables/add_global_table_region.py)     |
| Add Provisioned Capacity                            | [Python](./WorkingWithTables/add_provisioned_capacity.py)    |
| CreateGlobalTable                                   | Python                                                       |
| CreateTable On-Demand                               | [Python](./WorkingWithTables/create_table_on-demand.py)      |
| CreateTable Provisioned                             | [Python](./WorkingWithTables/create_table_provisioned.py)    |
| Delete Global Table Region                          | [Python](./WorkingWithTables/delete_global_table_region.py)  |
| DeleteTable                                         | [Python](./WorkingWithTables/delete_table.py)                |
| DescribeGlobalTable and DescribeGlobalTableSettings | Python                                                       |
| DescribeLimits                                      | [Python](./WorkingWithTables/describe_limits.py)             |
| DescribeTable                                       | [Python](./WorkingWithTables/describe_table.py)              |
| Disable Autoscaling                                 | [Python](./WorkingWithTables/disable_auto-scaling.py)        |
| Enable Autoscaling                                  | [Python](./WorkingWithTables/enable_auto-scaling.py)         |
| Update Autoscaling                                  | Python                                                       |
| Disable Streams                                     | Python                                                       |
| Enable Streams                                      | [Python](./WorkingWithTables/enable_streams.py)              |
| ListTables                                          | [Python](./WorkingWithTables/list_tables.py)                 |
| UpdateGlobalTable and UpdateGlobalTableSettings     | Python                                                       |
| UpdateTable On-Demand                               | [Python](./WorkingWithTables/table_change_to_on-demand.py)   |
| UpdateTable Provisioned                             | [Python](./WorkingWithTables/table_change_to_provisioned.py) |
