# DynamoDB SDK Examples
This directory contains examples in various AWS SDKs for use with Amazon DynamoDB. We are always looking for new contributions if you want to submit a pull request.
## Working with Items

| All Examples 👉       | C++ | Go  | Java | JavaScript | .NET                                         | Node.js                                                          | PHP | Python                                                         | Rust |
| --------------------- | --- | --- | ---- | ---------- | -------------------------------------------- | ---------------------------------------------------------------- | --- | -------------------------------------------------------------- | ---- |
| BatchGet              | C++ | Go  | Java | JavaScript | .NET                                                       | [Node.js](./node.js/WorkingWithItems/batch-get.js)               | PHP | [Python](./python/WorkingWithItems/batch_get.py)               | Rust |
| BatchWrite            | C++ | Go  | Java | JavaScript | .NET                                                       | [Node.js](./node.js/WorkingWithItems/batch-write.js)             | PHP | [Python](./python/WorkingWithItems/batch_write.py)             | Rust |
| DeleteItem            | C++ | Go  | Java | JavaScript | [.NET](./dotnet/WorkingWithItems/DeleteItem.cs)            | [Node.js](./node.js/WorkingWithItems/delete-item.js)             | PHP | Python                                                         | Rust |
| DeleteItemConditional | C++ | Go  | Java | JavaScript | [.NET](./dotnet/WorkingWithItems/DeleteItemConditional.cs) | Node.js                                                          | PHP | Python                                                         | Rust |
| GetItem               | C++ | Go  | Java | JavaScript | [.NET](./dotnet/WorkingWithItems/GetItem.cs)               | [Node.js](./node.js/WorkingWithItems/get-item.js)                | PHP | [Python](./python/WorkingWithItems/get_item.py)                | Rust |
| PutItem               | C++ | Go  | Java | JavaScript | [.NET](./dotnet/WorkingWithItems/PutItem.cs)               | [Node.js](./node.js/WorkingWithItems/put-item.js)                | PHP | [Python](./python/WorkingWithItems/put_item.py)                | Rust |
| PutItemConditional    | C++ | Go  | Java | JavaScript | [.NET](./dotnet/WorkingWithItems/PutItemConditional.cs)    | [Node.js](./node.js/WorkingWithItems/put-item-conditional.js)    | PHP | [Python](./python/WorkingWithItems/put_item_conditional.py)    | Rust |
| TransactGet           | C++ | Go  | Java | JavaScript | .NET                                                       | [Node.js](./node.js/WorkingWithItems/transact-get.js)            | PHP | Python                                                         | Rust |
| TransactWrite         | C++ | Go  | Java | JavaScript | .NET                                                       | [Node.js](./node.js/WorkingWithItems/transact-write.js)          | PHP | [Python](./python/WorkingWithItems/transact_write.py)          | Rust |
| UpdateItem            | C++ | Go  | Java | JavaScript | [.NET](./dotnet/WorkingWithItems/UpdateItem.cs)            | [Node.js](./node.js/WorkingWithItems/update-item.js)             | PHP | [Python](./python/WorkingWithItems/updating_item.py)           | Rust |
| UpdateItemConditional | C++ | Go  | Java | JavaScript | [.NET](./dotnet/WorkingWithItems/UpdateItemConditional.cs) | [Node.js](./node.js/WorkingWithItems/update-item-conditional.js) | PHP | [Python](./python/WorkingWithItems/update_item_conditional.py) | Rust |

## Working with Indexes

| All Examples 👉 | C++ | Go  | Java | JavaScript | .NET | Node.js | PHP | Python | Rust |
| --------------- | --- | --- | ---- | ---------- | ---- | ------- | --- | ------ | ---- |
|                 | C++ | Go  | Java | JavaScript | .NET | Node.js | PHP | Python | Rust |

## Working with Queries

| All Examples 👉        | C++ | Go  | Java | JavaScript | .NET | Node.js                                                                   | PHP | Python                                                                  | Rust |
| ---------------------- | --- | --- | ---- | ---------- | ---- | ------------------------------------------------------------------------- | --- | ----------------------------------------------------------------------- | ---- |
| ConsistentRead         | C++ | Go  | Java | JavaScript | .NET | [Node.js](./node.js/WorkingWithQueries/query-consistent-read.js)          | PHP | [Python](./python/WorkingWithQueries/query-consistent-read.py)          | Rust |
| Count                  | C++ | Go  | Java | JavaScript | .NET | [Node.js](./node.js/WorkingWithQueries/query-scan-count.js)               | PHP | [Python](./python/WorkingWithQueries/query-scan-count.py)               | Rust |
| FilterExpression       | C++ | Go  | Java | JavaScript | .NET | [Node.js](./node.js/WorkingWithQueries/query-filter-expression.js)        | PHP | [Python](./python/WorkingWithQueries/query_filter_expression.py)        | Rust |
| ProjectionExpression   | C++ | Go  | Java | JavaScript | .NET | [Node.js](./node.js/WorkingWithQueries/query-projection-expression.js)    | PHP | [Python](./python/WorkingWithQueries/query_projection_expression.py)    | Rust |
| ReturnConsumedCapacity | C++ | Go  | Java | JavaScript | .NET | [Node.js](./node.js/WorkingWithQueries/query-return-consumed-capacity.js) | PHP | [Python](./python/WorkingWithQueries/query-return-consumed-capacity.py) | Rust |

## Working with Scans

| All Examples 👉 | C++ | Go  | Java | JavaScript | .NET | Node.js | PHP | Python | Rust |
| --------------- | --- | --- | ---- | ---------- | ---- | ------- | --- | ------ | ---- |
|                 | C++ | Go  | Java | JavaScript | .NET | Node.js | PHP | Python | Rust |

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
| CreateTable On-Demand                               | C++ | [Go](./golang/WorkingWithTables/createTableOnDemand/createTableOnDemand.go)  | Java | JavaScript | .NET | [Node.js](./node.js/WorkingWithTables/create_table_on_demand.js)                          | PHP | [Python](./python/WorkingWithTables/create_table_on-demand.py)      | Rust |
| CreateTable Provisioned                             | C++ | [Go](./golang/WorkingWithTables/createTableProvisioned/createTableProvisioned.go)  | Java | JavaScript | .NET | [Node.js](./node.js/WorkingWithTables/create_table_provisioned.js)                        | PHP | [Python](./python/WorkingWithTables/create_table_provisioned.py)    | Rust |
| Delete Global Table Region                          | C++ | [Go](./golang/WorkingWithTables/deleteGlobalTableRegion/deleteGlobalTableRegion.go)  | Java | JavaScript | .NET | [Node.js](./node.js/WorkingWithTables/delete-global-table-region.js)                      | PHP | [Python](./python/WorkingWithTables/delete_global_table_region.py)  | Rust |
| DeleteTable                                         | C++ | [Go](./golang/WorkingWithTables/deleteTable/deleteTable.go)  | Java | JavaScript | .NET | [Node.js](./node.js/WorkingWithTables/delete_table.js)                                    | PHP | [Python](./python/WorkingWithTables/delete_table.py)                | Rust |
| DescribeGlobalTable and DescribeGlobalTableSettings | C++ | [Go](./golang/WorkingWithTables/describeGlobalTable/describeGlobalTable.go)  | Java | JavaScript | .NET | [Node.js](./node.js/WorkingWithTables/describe-global-table-and-global-table-settings.js) | PHP | Python                                                              | Rust |
| DescribeLimits                                      | C++ | [Go](./golang/WorkingWithTables/describeLimits/describeLimits.go)  | Java | JavaScript | .NET | [Node.js](./node.js/WorkingWithTables/describe_limits.js)                                 | PHP | [Python](./python/WorkingWithTables/describe_limits.py)             | Rust |
| DescribeTable                                       | C++ | [Go](./golang/WorkingWithTables/describeTable/describeTable.go)  | Java | JavaScript | .NET | [Node.js](./node.js/WorkingWithTables/describe_table.js)                                  | PHP | [Python](./python/WorkingWithTables/describe_table.py)              | Rust |
| Disable Autoscaling                                 | C++ | [Go](./golang/WorkingWithTables/disableAutoscaling/disableAutoscaling.go)  | Java | JavaScript | .NET | [Node.js](./node.js/WorkingWithTables/disable_auto_scaling.js)                            | PHP | [Python](./python/WorkingWithTables/disable_auto-scaling.py)        | Rust |
| Enable Autoscaling                                  | C++ | [Go](./golang/WorkingWithTables/enableAutoscaling/enableAutoscaling.go)  | Java | JavaScript | .NET | [Node.js](./node.js/WorkingWithTables/enable_auto_scaling.js)                             | PHP | [Python](./python/WorkingWithTables/enable_auto-scaling.py)         | Rust |
| Update Autoscaling                                  | C++ | [Go](./golang/WorkingWithTables/updateAutoscaling/updateAutoscaling.go)  | Java | JavaScript | .NET | [Node.js](./node.js/WorkingWithTables/update_auto_scaling.js)                             | PHP | Python                                                              | Rust |
| Disable Streams                                     | C++ | [Go](./golang/WorkingWithTables/disableStreams/disableStreams.go) | Java | JavaScript | .NET | Node.js                                                                                   | PHP | Python                                                              | Rust |
| Enable Streams                                      | C++ | [Go](./golang/WorkingWithTables/enableStreams/enableStreams.go)  | Java | JavaScript | .NET | [Node.js](./node.js/WorkingWithTables/enable_streams.js)                                  | PHP | [Python](./python/WorkingWithTables/enable_streams.py)              | Rust |
| ListTables                                          | C++ | [Go](./golang/WorkingWithTables/listTables/listTables.go)  | Java | JavaScript | .NET | [Node.js](./node.js/WorkingWithTables/list_tables.js)                                     | PHP | [Python](./python/WorkingWithTables/list_tables.py)                 | Rust |
| UpdateGlobalTable and UpdateGlobalTableSettings     | C++ | [Go](./golang/WorkingWithTables/updateGlobalTable/updateGlobalTable.go)  | Java | JavaScript | .NET | [Node.js](./node.js/WorkingWithTables/update-global-table-and-global-table-settings.js)   | PHP | Python                                                              | Rust |
| UpdateTable On-Demand                               | C++ | [Go](./golang/WorkingWithTables/changeTableToOnDemand/changeTableToOnDemand.go)  | Java | JavaScript | .NET | [Node.js](./node.js/WorkingWithTables/table_change_to_on_demand.js)                       | PHP | [Python](./python/WorkingWithTables/table_change_to_on-demand.py)   | Rust |
| UpdateTable Provisioned                             | C++ | [Go](./golang/WorkingWithTables/changeTableToProvisioned/changeTableToProvisioned.go)  | Java | JavaScript | .NET | [Node.js](./node.js/WorkingWithTables/table_change_to_provisioned.js)                     | PHP | [Python](./python/WorkingWithTables/table_change_to_provisioned.py) | Rust |
