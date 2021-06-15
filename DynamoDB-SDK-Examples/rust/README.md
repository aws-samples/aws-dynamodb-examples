# Rust SDK examples for Amazon DynamoDB

This section contains Rust code for examples and common tasks with Amazon DynamoDB.

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

## Working with Items

| All Examples 👉       | Rust |
| --------------------- | ---- |
| BatchGet              | Rust |
| BatchWrite            | Rust |
| DeleteItem            | Rust |
| DeleteItemConditional | Rust |
| GetItem               | Rust |
| PutItem               | Rust |
| PutItemConditional    | Rust |
| TransactGet           | Rust |
| TransactWrite         | Rust |
| UpdateItem            | Rust |
| UpdateItemConditional | Rust |

## Working with Indexes

| All Examples 👉 | Rust |
| --------------- | ---- |
|                 | Rust |

## Working with Queries

| All Examples 👉        | Rust |
| ---------------------- | ---- |
| ConsistentRead         | Rust |
| Count                  | Rust |
| FilterExpression       | Rust |
| ProjectionExpression   | Rust |
| ReturnConsumedCapacity | Rust |

## Working with Scans

| All Examples 👉 | Rust |
| --------------- | ---- |
|                 | Rust |

## Working with Streams

| All Examples 👉 | Rust |
| --------------- | ---- |
|                 | Rust |

## Working with Tables

| All Examples 👉                                     | Rust |
| --------------------------------------------------- | ---- |
| Add Global Table Region                             | Rust |
| Add Provisioned Capacity                            | Rust |
| CreateGlobalTable                                   | Rust |
| CreateTable On-Demand                               | Rust |
| CreateTable Provisioned                             | Rust |
| Delete Global Table Region                          | Rust |
| DeleteTable                                         | Rust |
| DescribeGlobalTable and DescribeGlobalTableSettings | Rust |
| DescribeLimits                                      | Rust |
| DescribeTable                                       | Rust |
| Disable Autoscaling                                 | Rust |
| Enable Autoscaling                                  | Rust |
| Update Autoscaling                                  | Rust |
| Disable Streams                                     | Rust |
| Enable Streams                                      | Rust |
| ListTables                                          | Rust |
| UpdateGlobalTable and UpdateGlobalTableSettings     | Rust |
| UpdateTable On-Demand                               | Rust |
| UpdateTable Provisioned                             | Rust |

