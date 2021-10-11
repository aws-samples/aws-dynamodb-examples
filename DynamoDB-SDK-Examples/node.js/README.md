# Node.js SDK examples for Amazon DynamoDB

This section contains Node.js code for examples and common tasks with Amazon DynamoDB.

## Working with Items
Node.js example code for working with items in Amazon DynamoDB.

| All Examples 👉       | Node.js                                                  | Comments |
| --------------------- | -------------------------------------------------------- | ------- |
| BatchGet              | [Node.js](./WorkingWithItems/batch-get.js)               | Example code of BatchGetItem API call |
| BatchWrite            | [Node.js](./WorkingWithItems/batch-write.js)             | Example code of BatchWriteItem API call |
| DeleteItem            | [Node.js](./WorkingWithItems/delete-item.js)             | Example code of DeleteItem API call |
| GetItem               | [Node.js](./WorkingWithItems/get-item.js)                | Example code of GetItem API call |
| PutItem               | [Node.js](./WorkingWithItems/put-item.js)                | Example code of PutItem API call |
| PutItemConditional    | [Node.js](./WorkingWithItems/put-item-conditional.js)    | Example code of PutItem API call with a conditional expression. |
| TransactGet           | [Node.js](./WorkingWithItems/transact-get.js)            | Example code of TransactGetItem API call |
| TransactWrite         | [Node.js](./WorkingWithItems/transact-write.js)          | Example code of TransactWriteItem API call |
| UpdateItem            | [Node.js](./WorkingWithItems/update-item.js)             | Example code of UpdateItem API call |
| UpdateItemConditional | [Node.js](./WorkingWithItems/update-item-conditional.js) | Example code of UpdateItem API call with a conditional expression. |

## Working with PartiQL for DynamoDB
Node.js example code using PartiQL for Amazon DynamoDB

| All Examples 👉       | Node.js                                                   | Comments |
| --------------------- | --------------------------------------------------------- | ------- |
| PartiQL SimpleSelectStatement | [Node.js](./WorkingWithPartiQL/simple-select-statement.js) | Example code of a select with PartiQL in Node.js. |
| PartiQL ExecuteStatement | [Node.js](./WorkingWithPartiQL/execute-statement.js) | Example code of a select with PartiQL in Node.js. |
| PartiQL ExecuteTransaction | [Node.js](./WorkingWithPartiQL/execute-transaction.js) | Example code of executing a transaction using PartiQL in Node.js. |
| PartiQL BatchExecuteStatement | [Node.js](./WorkingWithPartiQL/batch-execute-statement.js) | Example code of executing batch operations using PartiQL in Node.js. |

## Working with Indexes
Node.js example code for managing indexes with Amazon DynamoDB.

| All Examples 👉 | Node.js | Comments |
| --------------- | ------- | ------- |
| Create Index    | [Node.js](./WorkingWithIndexes/CreateIndex.js) | Example code on how to create an index with Node.js |
| Update Index Provisioned Capacity    | [Node.js](./WorkingWithIndexes/UpdateIndexProvisionedCapacity.js) | Example code on how to update an existing index's provisioned capacity. |
| Delete Index    | [Node.js](./WorkingWithIndexes/DeleteIndex.js) | Example code on how to delete an existing index with Node.js. |
| Query Index     | TBD | Example code on how to query a secondary index with Node.js. |

## Working with Query Operations
Node.js example code for performing query operations with Amazon DynamoDB.

| All Examples 👉        | Node.js                                                           |Comments              |
| ---------------------- | ----------------------------------------------------------------- | ---------------------- |
| Consistent read         | [Node.js](./WorkingWithQueries/query-consistent-read.js)          | Example code of a query API call with strong consistency |
| Count                  | [Node.js](./WorkingWithQueries/query-scan-count.js)               | |
| Filter expression       | [Node.js](./WorkingWithQueries/query-filter-expression.js)        | Example code of a query API call with a filter expression |
| Key condition and begins_with | [Node.js](./WorkingWithQueries/query-key-condition-expression-begins-with.js) | Example code of a query API call using a key condition and begins_with on the sort key |
| Key condition, begins_with, sort order | [Node.js](./WorkingWithQueries/query-key-condition-expression-begins-with-sort-order.js) | Example code of a query API call using a key condition, begins_with on the sort key, and a sort order |
| Key condition and between dates | [Node.js](./WorkingWithQueries/query-key-condition-expression-between-dates.js) | Example code of a query API call using a key condition and between two dates. |
| Key condition and between numbers | [Node.js](./WorkingWithQueries/query-key-condition-expression-between-numbers.js) | Example code of a query API call using a key condition and between two numbers. |
| Key condition and equals | [Node.js](./WorkingWithQueries/query-key-condition-expression-equals.js) | Example code of a query API call using a key condition and compares two values with equals. |
| Key condition and greater or equals | [Node.js](./WorkingWithQueries/query-key-condition-expression-greater-equal.js) | Example code of a query API call using a key condition and one value is greater than or equal to another. |
| Key condition and greater than | [Node.js](./WorkingWithQueries/query-key-condition-expression-greater.js) | Example code of a query API call using a key condition and one value is greater than another. |
| Key condition and less or equals | [Node.js](./WorkingWithQueries/query-key-condition-expression-less-equal.js) | Example code of a query API call using a key condition and one value is less than or equal to another. |
| Key condition and less | [Node.js](./WorkingWithQueries/query-key-condition-expression-less.js) | Example code of a query API call using a key condition and one value is less than another. |
| Query with pagination | [Node.js](./WorkingWithQueries/query-with-pagination.js) | Example of a query API call and paginating through the results. |
| Query with pagination - all data | [Node.js](./WorkingWithQueries/query-with-pagination-all-data.js) | Example of a query API call and paginating through all of the results. |
| Query with backwards pagination | [Node.js](./WorkingWithQueries/query-with-pagination-backwards.js) | Example of a query API call and paginating backwards through the results. |
| Projection expression   | [Node.js](./WorkingWithQueries/query-projection-expression.js)    | Example of a query API call with a projection expression. |
|
## Working with Scan Operations
Node.js example code for performing scan operations with Amazon DynamoDB.

| All Examples 👉 | Node.js | Comments              |
| --------------- | ------- | ------- |
| Scan with Pagination | [Node.js](./WorkingWithScans/scan-fetch-all-pagination.js) | Example code for scanning|
| Scan Parallel Segments|[Node.js](./WorkingWithScans/scan-parallel-segments.js) | |

## Working with DynamoDB Streams

| All Examples 👉 | Node.js |Comments              |
| --------------- | ------- | ------- |
|                 | Node.js | |

## Working with Tables
Example code to help you manage Amazon DynamoDB tables, manage global tables, and more using Node.js.

| All Examples 👉                                     | Node.js                                                                           | Comments              |
| --------------------------------------------------- | --------------------------------------------------------------------------------- |---------------------|
| Add Global Table Region                             | [Node.js](./WorkingWithTables/add-global-table-region.js)                         | An example of adding a region for DynamoDB global tables.                    |
| Add Provisioned Capacity                            | [Node.js](./WorkingWithTables/add_provisioned_capacity.js)                        | |
| CreateGlobalTable                                   | [Node.js](./WorkingWithTables/create-global-table.js)                             ||
| CreateTable On-Demand                               | [Node.js](./WorkingWithTables/create_table_on_demand.js)                          ||
| CreateTable Provisioned                             | [Node.js](./WorkingWithTables/create_table_provisioned.js)                        ||
| Delete Global Table Region                          | [Node.js](./WorkingWithTables/delete-global-table-region.js)                      ||
| DeleteTable                                         | [Node.js](./WorkingWithTables/delete_table.js)                                    ||
| DescribeGlobalTable and DescribeGlobalTableSettings | [Node.js](./WorkingWithTables/describe-global-table-and-global-table-settings.js) ||
| DescribeLimits                                      | [Node.js](./WorkingWithTables/describe_limits.js)                                 ||
| DescribeTable                                       | [Node.js](./WorkingWithTables/describe_table.js)                                  ||
| Disable Autoscaling                                 | [Node.js](./WorkingWithTables/disable_auto_scaling.js)                            ||
| Enable Autoscaling                                  | [Node.js SDK v3](./WorkingWithTables/enable_auto_scaling_v3.js), [Node.js SDK v2](./WorkingWithTables/enable_auto_scaling_v2.js)                             | |
| Update Autoscaling                                  | [Node.js SDK v3](./WorkingWithTables/update_auto_scaling_v3.js), [Node.js SDK v2](./WorkingWithTables/update_auto_scaling_v2.js)                              | |
| Disable Streams                                     | [Node.js](./WorkingWithTables/disable_streams.js)                                                                          | |
| Enable Streams                                      | [Node.js](./WorkingWithTables/enable_streams.js)                                  | |
| ListTables                                          | [Node.js](./WorkingWithTables/list_tables.js)                                     | |
| UpdateGlobalTable and UpdateGlobalTableSettings     | [Node.js](./WorkingWithTables/update-global-table-and-global-table-settings.js)   | |
| UpdateTable On-Demand                               | [Node.js](./WorkingWithTables/table_change_to_on_demand.js)                       | |
| UpdateTable Provisioned                             | [Node.js](./WorkingWithTables/table_change_to_provisioned.js)                     | |

## Working with Backups
Example code that will help you manage backups of Amazon DynamoDB tables.

| All Examples 👉                                     | Node.js           | Comments |
| --------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------ |
| Create an on-demand backup                             | [Node.js](./WorkingWithBackups/CreateOn-DemandBackup.js)                         | Sample code to create an on-demand backup of a DynamoDB table using Node.js. |
| Delete backup                            | [Node.js](./WorkingWithBackups/DeleteBackup.js)                        | Sample code to delete an on-demand backup of a DynamoDB table using Node.js. |
| Describe backup                                   | [Node.js](./WorkingWithBackups/DescribeBackup.js)                             | Sample code to describe a specific on-demand backup of a DynamoDB table using Node.js. |