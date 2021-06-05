# Rust SDK examples for Amazon DynamoDB - Scan API

First, create a table:
```
cd ../working_with_tables
cargo run --bin create-table-on-demand
cd -
```

Second, prepare test data for query
```
cd ../working_with_queries
cargo run --bin prepare-query-data
cd -
```

Then you can run the scan example
```
cargo run --bin scan-with-pagination
cargo run --bin scan-in-parallel
```

Finally, you can delete the table
```
cd ../working_with_tables
cargo run --bin delete-table
cd -
```
