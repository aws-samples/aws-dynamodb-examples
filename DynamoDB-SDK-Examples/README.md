# DynamoDB SDK Examples
This directory contains examples in various AWS SDKs for use with Amazon DynamoDB. We are always looking for new contributions if you want to submit a pull request.
## Working with Items

| All Examples 👉       | C++ | Go  | Java | JavaScript | .NET                                         | Node.js                                                          | PHP | Python                                                         | Rust |
| --------------------- | --- | --- | ---- | ---------- | -------------------------------------------- | ---------------------------------------------------------------- | --- | -------------------------------------------------------------- | ---- |
| BatchGet              | C++ | Go  | Java | JavaScript | [.NET](./dotnet/WorkingWithItems/BatchGetItem.cs)         | [Node.js](./node.js/WorkingWithItems/batch-get.js)               | PHP | [Python](./python/WorkingWithItems/batch_get.py)               | [Rust](./rust/working_with_items/src/batch-get/main.rs) |
| BatchWrite            | C++ | Go  | Java | JavaScript | [.NET](./dotnet/WorkingWithItems/BatchWriteItem.cs)       | [Node.js](./node.js/WorkingWithItems/batch-write.js)             | PHP | [Python](./python/WorkingWithItems/batch_write.py)             | [Rust](./rust/working_with_items/src/batch-write/main.rs) |
| DeleteItem            | C++ | Go  | Java | JavaScript | [.NET](./dotnet/WorkingWithItems/DeleteItem.cs)            | [Node.js](./node.js/WorkingWithItems/delete-item.js)             | PHP | Python                                                         | [Rust](./rust/working_with_items/src/delete-item/main.rs) |
| DeleteItemConditional | C++ | Go  | Java | JavaScript | [.NET](./dotnet/WorkingWithItems/DeleteItemConditional.cs) | [Node.js](./node.js/WorkingWithItems/delete-item.js)                                                        | PHP | Python                                                         | Rust |
| GetItem               | C++ | Go  | Java | JavaScript | [.NET](./dotnet/WorkingWithItems/GetItem.cs)               | [Node.js](./node.js/WorkingWithItems/get-item.js)                | PHP | [Python](./python/WorkingWithItems/get_item.py)                | [Rust](./rust/working_with_items/src/get-item/main.rs) |
| PutItem               | C++ | Go  | Java | JavaScript | [.NET](./dotnet/WorkingWithItems/PutItem.cs)               | [Node.js](./node.js/WorkingWithItems/put-item.js)                | PHP | [Python](./python/WorkingWithItems/put_item.py)                | [Rust](./rust/working_with_items/src/put-item/main.rs) |
| PutItemConditional    | C++ | Go  | Java | JavaScript | [.NET](./dotnet/WorkingWithItems/PutItemConditional.cs)    | [Node.js](./node.js/WorkingWithItems/put-item-conditional.js)    | PHP | [Python](./python/WorkingWithItems/put_item_conditional.py)    | [Rust](./rust/working_with_items/src/conditional-put-item/main.rs) |
| TransactGet           | C++ | Go  | Java | JavaScript | [.NET](./dotnet/WorkingWithItems/TransactGetItems.cs)             | [Node.js](./node.js/WorkingWithItems/transact-get.js)            | PHP | Python                                                         | [Rust](./rust/working_with_items/src/transact-get/main.rs) |
| TransactWrite         | C++ | Go  | Java | JavaScript | [.NET](./dotnet/WorkingWithItems/TransactWriteItems.cs)           | [Node.js](./node.js/WorkingWithItems/transact-write.js)          | PHP | [Python](./python/WorkingWithItems/transact_write.py)          | [Rust](./rust/working_with_items/src/transact-put/main.rs) |
| UpdateItem            | C++ | Go  | Java | JavaScript | [.NET](./dotnet/WorkingWithItems/UpdateItem.cs)            | [Node.js](./node.js/WorkingWithItems/update-item.js)             | PHP | [Python](./python/WorkingWithItems/updating_item.py)           | [Rust](./rust/working_with_items/src/update-item/main.rs) |
| UpdateItemConditional | C++ | Go  | Java | JavaScript | [.NET](./dotnet/WorkingWithItems/UpdateItemConditional.cs) | [Node.js](./node.js/WorkingWithItems/update-item-conditional.js) | PHP | [Python](./python/WorkingWithItems/update_item_conditional.py) | [Rust](./rust/working_with_items/src/conditional-update-item/main.rs) |

## Working with PartiQL for DynamoDB

| All Examples 👉 | C++ | Go  | Java | JavaScript | .NET | Node.js | PHP | Python | Rust |
| --------------- | --- | --- | ---- | ---------- | ---- | ------- | --- | ------ | ---- |
| PartiQL SimpleSelectStatement | C++ | Go  | Java | JavaScript | .NET | [Node.js](./node.js/WorkingWithPartiQL/simple-select-statement.js) | PHP | [Python](./python/WorkingWithPartiQL/simple-select-statement.py) | Rust |
| PartiQL ExecuteStatement | C++ | Go  | Java | JavaScript | .NET | [Node.js](./node.js/WorkingWithPartiQL/execute-statement.js) | PHP | [Python](./python/WorkingWithPartiQL/execute-statement.py) | Rust |
| PartiQL ExecuteTransaction | C++ | Go  | Java | JavaScript | .NET | [Node.js](./node.js/WorkingWithPartiQL/execute-transaction.js) | PHP | [Python](./python/WorkingWithPartiQL/execute-transaction.py) | Rust |
| PartiQL BatchExecuteStatement | C++ | Go  | Java | JavaScript | .NET | [Node.js](./node.js/WorkingWithPartiQL/batch-execute-statement.js) | PHP | [Python](./python/WorkingWithPartiQL/batch-execute-statement.py) | Rust |

## Working with Indexes

| All Examples 👉 | C++ | Go  | Java | JavaScript | .NET | Node.js | PHP | Python | Rust |
| --------------- | --- | --- | ---- | ---------- | ---- | ------- | --- | ------ | ---- |
| Create Index    | C++ | Go  | Java | JavaScript | .NET | Node.js | PHP | Python | [Rust](./rust/working_with_indexes/src/create-index/main.rs) |
| Update Index Provisioned Capacity    | C++ | Go  | Java | JavaScript | .NET | [Node.js](./Node.js/WorkingWithIndexes/UpdateIndexProvisionedCapacity.js) | PHP | Python | Rust |
| Delete Index    | C++ | Go  | Java | JavaScript | .NET | [Node.js](./Node.js/WorkingWithIndexes/DeleteIndex.js) | PHP | Python | [Rust](./rust/working_with_indexes/src/delete-index/main.rs) |
| Query Index     | C++ | Go  | [Java Enhanced Async](./java/WorkingWithIndexes/TableAsyncQueryIndex.java)  | JavaScript | .NET | Node.js | PHP | Python | [Rust](./rust/working_with_indexes/src/query-index/main.rs) |

## Working with Queries

| All Examples 👉        | C++ | Go  | Java | JavaScript | .NET | Node.js                                                                   | PHP | Python                                                                  | Rust |
| ---------------------- | --- | --- | ---- | ---------- | ---- | ------------------------------------------------------------------------- | --- | ----------------------------------------------------------------------- | ---- |
| ConsistentRead         | C++ | Go  | [Java Enhanced Async](./java/WorkingWithQueries/TableAsyncQuery.java)  | JavaScript | .NET | [Node.js](./node.js/WorkingWithQueries/query-consistent-read.js)          | PHP | [Python](./python/WorkingWithQueries/query-consistent-read.py)          | [Rust](./rust/working_with_queries/src/query-consistent-read/main.rs) |
| Count                  | C++ | Go  | Java | JavaScript | .NET | [Node.js](./node.js/WorkingWithQueries/query-scan-count.js)               | PHP | [Python](./python/WorkingWithQueries/query-scan-count.py)               | Rust |
| FilterExpression       | C++ | Go  | Java | JavaScript | .NET | [Node.js](./node.js/WorkingWithQueries/query-filter-expression.js)        | PHP | [Python](./python/WorkingWithQueries/query_filter_expression.py)        | [Rust](./rust/working_with_queries/src/query-scan-filter/main.rs) |
| ProjectionExpression   | C++ | Go  | Java | JavaScript | .NET | [Node.js](./node.js/WorkingWithQueries/query-projection-expression.js)    | PHP | [Python](./python/WorkingWithQueries/query_projection_expression.py)    | [Rust](./rust/working_with_queries/src/query-projection/main.rs) |
| ReturnConsumedCapacity | C++ | Go  | Java | JavaScript | .NET | [Node.js](./node.js/WorkingWithQueries/query-return-consumed-capacity.js) | PHP | [Python](./python/WorkingWithQueries/query-return-consumed-capacity.py) | [Rust](./rust/working_with_queries/src/query-consumed-capacity/main.rs) |

## Working with Scans

| All Examples 👉          | C++ | Go  | Java | JavaScript | .NET | Node.js | PHP | Python | Rust |
| ------------------------ | --- | --- | ---- | ---------- | ---- | ------- | --- | ------ | ---- |
| Scan with pagination     | C++ | Go  | [Java Enhanced Async](./java/WorkingWithScans/TableAsyncScan.java) | JavaScript | .NET | [Node.js](./node.js/WorkingWithScans/scan-fetch-all-pagination.js) | PHP | Python | [Rust](./rust/working_with_scans/src/scan-with-pagination/main.rs) |
| Scan in parallel         | C++ | Go  | Java | JavaScript | .NET | [Node.js](./node.js/WorkingWithScans/scan-parallel-segments.js) | PHP | Python | [Rust](./rust/working_with_scans/src/scan-in-parallel/main.rs) |

## Working with Streams

| All Examples 👉 | C++ | Go  | Java | JavaScript | .NET | Node.js | PHP | Python | Rust |
| --------------- | --- | --- | ---- | ---------- | ---- | ------- | --- | ------ | ---- |
|                 | C++ | Go  | Java | JavaScript | .NET | Node.js | PHP | Python | Rust |

## Working with Tables

| All Examples 👉                                     | C++ | Go  | Java | JavaScript | .NET | Node.js                                                                                   | PHP | Python                                                              | Rust |
| --------------------------------------------------- | --- | --- | ---- | ---------- | ---- | ----------------------------------------------------------------------------------------- | --- | ------------------------------------------------------------------- | ---- |
| Add Global Table Region                             | C++ | [Go](./golang/WorkingWithTables/addGlobalTableRegion/addGlobalTableRegion.go)  | Java | JavaScript | .NET | [Node.js](./node.js/WorkingWithTables/add-global-table-region.js)                         | PHP | [Python](./python/WorkingWithTables/add_global_table_region.py)     | Rust |
| Add Provisioned Capacity                            | C++ | [Go](./golang/WorkingWithTables/addProvisionedCapacity/addProvisionedCapacity.go)  | Java | JavaScript | .NET | [Node.js](./node.js/WorkingWithTables/add_provisioned_capacity.js)                        | PHP | [Python](./python/WorkingWithTables/add_provisioned_capacity.py)    | Rust |
| CreateGlobalTable                                   | C++ | [Go](./golang/WorkingWithTables/createGlobalTable/createGlobalTable.go)  | Java | JavaScript | .NET | [Node.js](./node.js/WorkingWithTables/create-global-table.js)                             | PHP | Python                                                              | Rust |
| CreateTable On-Demand                               | C++ | [Go](./golang/WorkingWithTables/createTableOnDemand/createTableOnDemand.go)  | Java | JavaScript | .NET | [Node.js](./node.js/WorkingWithTables/create_table_on_demand.js)                          | PHP | [Python](./python/WorkingWithTables/create_table_on-demand.py)      | [Rust](./rust/working_with_tables/src/create-table-on-demand/main.rs) |
| CreateTable Provisioned                             | C++ | [Go](./golang/WorkingWithTables/createTableProvisioned/createTableProvisioned.go)  | Java | JavaScript | .NET | [Node.js](./node.js/WorkingWithTables/create_table_provisioned.js)                        | PHP | [Python](./python/WorkingWithTables/create_table_provisioned.py)    | Rust |
| Delete Global Table Region                          | C++ | [Go](./golang/WorkingWithTables/deleteGlobalTableRegion/deleteGlobalTableRegion.go)  | Java | JavaScript | .NET | [Node.js](./node.js/WorkingWithTables/delete-global-table-region.js)                      | PHP | [Python](./python/WorkingWithTables/delete_global_table_region.py)  | Rust |
| DeleteTable                                         | C++ | [Go](./golang/WorkingWithTables/deleteTable/deleteTable.go)  | Java | JavaScript | .NET | [Node.js](./node.js/WorkingWithTables/delete_table.js)                                    | PHP | [Python](./python/WorkingWithTables/delete_table.py)                | Rust |
| DescribeGlobalTable and DescribeGlobalTableSettings | C++ | [Go](./golang/WorkingWithTables/describeGlobalTable/describeGlobalTable.go)  | Java | JavaScript | .NET | [Node.js](./node.js/WorkingWithTables/describe-global-table-and-global-table-settings.js) | PHP | Python                                                              | Rust |
| DescribeLimits                                      | C++ | [Go](./golang/WorkingWithTables/describeLimits/describeLimits.go)  | Java | JavaScript | .NET | [Node.js](./node.js/WorkingWithTables/describe_limits.js)                                 | PHP | [Python](./python/WorkingWithTables/describe_limits.py)             | Rust |
| DescribeTable                                       | C++ | [Go](./golang/WorkingWithTables/describeTable/describeTable.go)  | Java | JavaScript | .NET | [Node.js](./node.js/WorkingWithTables/describe_table.js)                                  | PHP | [Python](./python/WorkingWithTables/describe_table.py)              | [Rust](rust/working_with_tables/src/describe-table/main.rs) |
| Disable Autoscaling                                 | C++ | [Go](./golang/WorkingWithTables/disableAutoscaling/disableAutoscaling.go)  | Java | JavaScript | .NET | [Node.js](./node.js/WorkingWithTables/disable_auto_scaling.js)                            | PHP | [Python](./python/WorkingWithTables/disable_auto-scaling.py)        | Rust |
| Enable Autoscaling                                  | C++ | [Go](./golang/WorkingWithTables/enableAutoscaling/enableAutoscaling.go)  | Java | JavaScript | .NET | [Node.js](./node.js/WorkingWithTables/enable_auto_scaling_v2.js)                             | PHP | [Python](./python/WorkingWithTables/enable_auto-scaling.py)         | Rust |
| Update Autoscaling                                  | C++ | [Go](./golang/WorkingWithTables/updateAutoscaling/updateAutoscaling.go)  | Java | JavaScript | .NET | [Node.js](./node.js/WorkingWithTables/update_auto_scaling_v2.js)                             | PHP | Python                                                              | Rust |
| Disable Streams                                     | C++ | [Go](./golang/WorkingWithTables/disableStreams/disableStreams.go) | Java | JavaScript | .NET | [Node.js](./node.js/WorkingWithTables/disable_streams.js)                                        | PHP | Python                                                              | [Rust](./rust/working_with_streams/src/disable-update-streams/main.rs) |
| Enable Streams                                      | C++ | [Go](./golang/WorkingWithTables/enableStreams/enableStreams.go)  | Java | JavaScript | .NET | [Node.js](./node.js/WorkingWithTables/enable_streams.js)                                  | PHP | [Python](./python/WorkingWithTables/enable_streams.py)              | [Rust](./rust/working_with_streams/src/enable-update-streams/main.rs) |
| ListTables                                          | C++ | [Go](./golang/WorkingWithTables/listTables/listTables.go)  | Java | JavaScript | .NET | [Node.js](./node.js/WorkingWithTables/list_tables.js)                                     | PHP | [Python](./python/WorkingWithTables/list_tables.py)                 | [Rust](./rust/working_with_tables/src/list-tables/main.rs) |
| UpdateGlobalTable and UpdateGlobalTableSettings     | C++ | [Go](./golang/WorkingWithTables/updateGlobalTable/updateGlobalTable.go)  | Java | JavaScript | .NET | [Node.js](./node.js/WorkingWithTables/update-global-table-and-global-table-settings.js)   | PHP | Python                                                              | Rust |
| UpdateTable On-Demand                               | C++ | [Go](./golang/WorkingWithTables/changeTableToOnDemand/changeTableToOnDemand.go)  | Java | JavaScript | .NET | [Node.js](./node.js/WorkingWithTables/table_change_to_on_demand.js)                       | PHP | [Python](./python/WorkingWithTables/table_change_to_on-demand.py)   | Rust |
| UpdateTable Provisioned                             | C++ | [Go](./golang/WorkingWithTables/changeTableToProvisioned/changeTableToProvisioned.go)  | Java | JavaScript | .NET | [Node.js](./node.js/WorkingWithTables/table_change_to_provisioned.js)                     | PHP | [Python](./python/WorkingWithTables/table_change_to_provisioned.py) | Rust |

While not an AWS SDK, if you are looking for alternative SDKs and libraries for DynamoDB. Try the following:
* [EfficientDynamoDB for C#](https://github.com/AllocZero/EfficientDynamoDb) is an alternative to the AWS .Net SDK.
* [Dynamoose](https://dynamoosejs.com/) is a Mongoose inspired library for node.js and TypeScript.