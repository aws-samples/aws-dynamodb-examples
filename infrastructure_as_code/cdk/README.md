# 📁 AWS CDK Projects

## 📂 DDB Migration

The [DDB Migration](./ddb-migration/README.md) project is a proof-of-concept CDK stack for table-to-table migration. It demonstrates:

- **Cross-account table replication:** Migrate tables between AWS accounts
- **Change Data Capture (CDC):** Use DynamoDB Streams to capture and replay changes
- **AWS Glue integration:** Leverage Glue for large-scale data transfers
- **Educational content:** Learn migration patterns and best practices

**Note:** This is a tutorial/POC project. Not for production migrations.

[Explore the DDB Migration project »](./ddb-migration/README.md)

## 📂 DynamoDBCustomMetrics

This CDK project publishes to CloudWatch two important metrics - table size and item count - that are not automatically pushed to CloudWatch. The [DynamoDBCustomMetrics](./DynamoDBCustomMetrics/README.md) project solves this by using AWS Lambda and Amazon EventBridge to capture and report these missing metrics to CloudWatch. This enables you to:

    - Monitor Table Growth: Gain visibility into the size and item count of your DynamoDB tables over time, helping you identify potential performance issues.
    - Optimize Provisioning: Use the collected metrics to set up alerts and auto-scaling policies, ensuring your DynamoDB tables are optimally provisioned.
    - Analyze Trends: Explore historical data on your table's growth, informing your capacity planning and optimization efforts.
