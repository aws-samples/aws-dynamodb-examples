# Rust SDK examples for Amazon DynamoDB

This section contains Rust code for examples and common tasks with Amazon DynamoDB.

Note: the AWS Rust SDK is still in alpha/beta. The samples in this repo worked as of their writing, but may not work with future versions of the SDK as its development progresses. If you find a samples that does not work, please [open an issue against this repo](https://github.com/aws-samples/aws-dynamodb-examples/issues).

Go [here for more AWS Rust SDK examples](https://github.com/awslabs/aws-sdk-rust/tree/main/sdk/examples).

## Setting up environment variable

Before you run the examples, make sure you set up the environment variable for your AWS credential & region info

Linux/MacOS

```
export AWS_ACCESS_KEY_ID=...
export AWS_SECRET_ACCESS_KEY=...
export AWS_DEFAULT_REGION=... # eg. us-east-1
```

Windows

```
set AWS_ACCESS_KEY_ID=...
set AWS_SECRET_ACCESS_KEY=...
set AWS_DEFAULT_REGION=... # eg. us-east-1
```

## 👨‍💻 Working with Items

Explore a wide range of operations for managing individual items in your DynamoDB tables, from batch processing to conditional updates.

[View the Item examples »](./data_plane/working_with_items/)

## 🔍 Working with Queries

Learn how to efficiently query your DynamoDB tables, with examples covering sorting, filtering, projections, and more.

[Explore the Query examples »](./data_plane/working_with_queries)

## 🔍 Working with Indexes

Discover how to leverage secondary indexes to optimize your data access patterns.

[Check out the Index examples »](./data_plane/working_with_indexes)

## 🔍 Working with Scans

Learn how to perform full table scans, including techniques for improving performance.

[Browse the Scan examples »](./data_plane/working_with_scans)

## 🌊 Working with Streams

Dive into the world of DynamoDB Streams and learn how to read and process real-time changes to your table data.

[Explore the Stream examples »](./data_plane/working_with_streams)

## 🗃️ Working with Tables

From creating and deleting tables to managing global tables and auto-scaling, this section has you covered for all your table management needs.

[Discover the Table examples »](./control_plane/working_with_tables)

# 🚀 Get Started

Each example in this folder comes with a README file that provides detailed instructions on setup, usage, and relevant context. Feel free to browse the examples and adapt the code to your specific DynamoDB-powered applications.

# Detailed list of supported operations

<!-- TODO: Create issue to Sync the operations with the code -->

You can consult the list of all the supported operations in this repo in the [Operations.md](./Operations.md)
