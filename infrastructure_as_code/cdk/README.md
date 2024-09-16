# 📁 AWS CDK Projects

## 📂 DynamoDBCustomMetrics

This CDK project publishes to CloudWatch two important metrics - table size and item count - that are not automatically pushed to CloudWatch. The [DynamoDBCustomMetrics](./DynamoDBCustomMetrics/README.md) project solves this by using AWS Lambda and Amazon EventBridge to capture and report these missing metrics to CloudWatch. This enables you to:

    - Monitor Table Growth: Gain visibility into the size and item count of your DynamoDB tables over time, helping you identify potential performance issues.
    - Optimize Provisioning: Use the collected metrics to set up alerts and auto-scaling policies, ensuring your DynamoDB tables are optimally provisioned.
    - Analyze Trends: Explore historical data on your table's growth, informing your capacity planning and optimization efforts.
