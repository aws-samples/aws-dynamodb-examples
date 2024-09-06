# Rust SDK examples for Amazon DynamoDB - GlobalSecondaryIndex

First, create a table:
```
cd ../working_with_tables
cargo run --bin create-table-on-demand
cd -
```

Second, create an index
```
cargo run --bin create-index
```

Third, prepare test data for query
```
cd ../working_with_queries
cargo run --bin prepare-query-data
cd -
```

Now you can run query the GSI
```
cargo run --bin query-gsi
```

Finally, you can delete the GSI
```
cargo run --bin delete-index
```
