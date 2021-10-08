# Node.js SDK examples for Amazon DynamoDB

This section contains Node.js code for examples and common tasks with Amazon DynamoDB.

## Working with Items
Example code for working with items in Amazon DynamoDB.

| All Examples 👉       | Node.js                                                  |
| --------------------- | -------------------------------------------------------- |
| BatchGet              | [Node.js](./WorkingWithItems/batch-get.js)               |
| BatchWrite            | [Node.js](./WorkingWithItems/batch-write.js)             |
| DeleteItem            | [Node.js](./WorkingWithItems/delete-item.js)             |
| GetItem               | [Node.js](./WorkingWithItems/get-item.js)                |
| PutItem               | [Node.js](./WorkingWithItems/put-item.js)                |
| PutItemConditional    | [Node.js](./WorkingWithItems/put-item-conditional.js)    |
| TransactGet           | [Node.js](./WorkingWithItems/transact-get.js)            |
| TransactWrite         | [Node.js](./WorkingWithItems/transact-write.js)          |
| UpdateItem            | [Node.js](./WorkingWithItems/update-item.js)             |
| UpdateItemConditional | [Node.js](./WorkingWithItems/update-item-conditional.js) |

## Working with PartiQL for DynamoDB
Directory contains example code using Node.js and PartiQL with Amazon DynamoDB

| All Examples 👉       | Node.js                                                   |
| --------------------- | --------------------------------------------------------- |
| PartiQL SimpleSelectStatement | [Node.js](./WorkingWithPartiQL/simple-select-statement.js) |
| PartiQL ExecuteStatement | [Node.js](./WorkingWithPartiQL/execute-statement.js) | 
| PartiQL ExecuteTransaction | [Node.js](./WorkingWithPartiQL/execute-transaction.js) |
| PartiQL BatchExecuteStatement | [Node.js](./WorkingWithPartiQL/batch-execute-statement.js) |

## Working with Indexes
Example code for managing indexes with Amazon DynamoDB.

| All Examples 👉 | Node.js |
| --------------- | ------- |
| Create Index    | TBD |
| Update Index Provisioned Capacity    | [Node.js](./WorkingWithIndexes/UpdateIndexProvisionedCapacity.js) |
| Delete Index    | [Node.js](./WorkingWithIndexes/DeleteIndex.js) |
| Query Index     | TBD |

## Working with Query Operations
Example code for performing query operations with Amazon DynamoDB.

| All Examples 👉        | Node.js                                                           |
| ---------------------- | ----------------------------------------------------------------- |
| Consistent read         | [Node.js](./WorkingWithQueries/query-consistent-read.js)          |
| Count                  | [Node.js](./WorkingWithQueries/query-scan-count.js)               |
| Filter expression       | [Node.js](./WorkingWithQueries/query-filter-expression.js)        |
| Key condition and begins_with | [Node.js](./WorkingWithQueries/query-key-condition-expression-begins-with.js) |
| Key condition, begins_with, sort order | [Node.js](./WorkingWithQueries/query-key-condition-expression-begins-with-sort-order.js) |
| Key condiftion and between dates | [Node.js](./WorkingWithQueries/query-key-condition-expression-between-dates.js) |
| Key condition and between numbers | [Node.js](./WorkingWithQueries/query-key-condition-expression-between-numbers.js) |
| Key condition and equals | [Node.js](./WorkingWithQueries/query-key-condition-expression-equals.js) |
| Key condition and greater or equals | [Node.js](./WorkingWithQueries/query-key-condition-expression-greater-equal.js) |
| Key condition and greater than | [Node.js](./WorkingWithQueries/query-key-condition-expression-greater.js) |
| Key condition and less than | [Node.js](./WorkingWithQueries/query-key-condition-expression-less-equal.js) |
| Key condition and less | [Node.js](./WorkingWithQueries/query-key-condition-expression-less.js) |
| Query with pagination | [Node.js](./WorkingWithQueries/query-with-pagination.js) |
| Query with pagination - all data | [Node.js](./WorkingWithQueries/query-with-pagination-all-data.js) |
| Query with backwards pagination | [Node.js](./WorkingWithQueries/query-with-pagination-backwards.js) |
| Projection expression   | [Node.js](./WorkingWithQueries/query-projection-expression.js)    |
| Return consumed capacity | [Node.js](./WorkingWithQueries/query-return-consumed-capacity.js) |

## Working with Scan Operations

| All Examples 👉 | Node.js |
| --------------- | ------- |
| Scan with Pagination | [Node.js](./WorkingWithScans/scan-fetch-all-pagination.js) |
| Scan Parallel Segments|[Node.js](./WorkingWithScans/scan-parallel-segments.js) |

## Working with DynamoDB Streams

| All Examples 👉 | Node.js |
| --------------- | ------- |
|                 | Node.js |

## Working with Tables
Example code to help you manage Amazon DynamoDB tables, manage global tables, and more.

| All Examples 👉                                     | Node.js                                                                           |
| --------------------------------------------------- | --------------------------------------------------------------------------------- |
| Add Global Table Region                             | [Node.js](./WorkingWithTables/add-global-table-region.js)                         |
| Add Provisioned Capacity                            | [Node.js](./WorkingWithTables/add_provisioned_capacity.js)                        |
| CreateGlobalTable                                   | [Node.js](./WorkingWithTables/create-global-table.js)                             |
| CreateTable On-Demand                               | [Node.js](./WorkingWithTables/create_table_on_demand.js)                          |
| CreateTable Provisioned                             | [Node.js](./WorkingWithTables/create_table_provisioned.js)                        |
| Delete Global Table Region                          | [Node.js](./WorkingWithTables/delete-global-table-region.js)                      |
| DeleteTable                                         | [Node.js](./WorkingWithTables/delete_table.js)                                    |
| DescribeGlobalTable and DescribeGlobalTableSettings | [Node.js](./WorkingWithTables/describe-global-table-and-global-table-settings.js) |
| DescribeLimits                                      | [Node.js](./WorkingWithTables/describe_limits.js)                                 |
| DescribeTable                                       | [Node.js](./WorkingWithTables/describe_table.js)                                  |
| Disable Autoscaling                                 | [Node.js](./WorkingWithTables/disable_auto_scaling.js)                            |
| Enable Autoscaling                                  | [Node.js SDK v3](./WorkingWithTables/enable_auto_scaling_v3.js), [Node.js SDK v2](./WorkingWithTables/enable_auto_scaling_v2.js)                             |
| Update Autoscaling                                  | [Node.js SDK v3](./WorkingWithTables/update_auto_scaling_v3.js), [Node.js SDK v2](./WorkingWithTables/update_auto_scaling_v2.js)                              |
| Disable Streams                                     | [Node.js](./WorkingWithTables/disable_streams.js)                                                                          |
| Enable Streams                                      | [Node.js](./WorkingWithTables/enable_streams.js)                                  |
| ListTables                                          | [Node.js](./WorkingWithTables/list_tables.js)                                     |
| UpdateGlobalTable and UpdateGlobalTableSettings     | [Node.js](./WorkingWithTables/update-global-table-and-global-table-settings.js)   |
| UpdateTable On-Demand                               | [Node.js](./WorkingWithTables/table_change_to_on_demand.js)                       |
| UpdateTable Provisioned                             | [Node.js](./WorkingWithTables/table_change_to_provisioned.js)                     |

## Working with Backups
Example code that will help you manage backups of Amazon DynamoDB tables.

| All Examples 👉                                     | Node.js                                                                           |
| --------------------------------------------------- | --------------------------------------------------------------------------------- |
| Create an on-demand backup                             | [Node.js](./WorkingWithBackups/CreateOn-DemandBackup.js)                         |
| Delete backup                            | [Node.js](./WorkingWithBackups/DeleteBackup.js)                        |
| Describe backup                                   | [Node.js](./WorkingWithBackups/DescribeBackup.js)                             |