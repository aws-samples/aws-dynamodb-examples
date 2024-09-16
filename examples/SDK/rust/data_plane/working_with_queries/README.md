# Rust SDK examples for Amazon DynamoDB - Query API

First, create a table:
```
cd ../working_with_tables
cargo run --bin create-table-on-demand
cd -
```

Second, prepare test data for query
```
cargo run --bin prepare-query-data
```

Then you can run the query example
```
cargo run --bin query-consistent-read
cargo run --bin query-scan-filter
cargo run --bin query-projection
```

Finally, you can delete the table
```
cd ../working_with_tables
cargo run --bin delete-table
cd -
```
