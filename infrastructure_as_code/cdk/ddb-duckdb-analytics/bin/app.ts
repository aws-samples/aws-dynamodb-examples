#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { DdbDuckdbAnalyticsStack } from '../lib/stack';

const app = new cdk.App();
new DdbDuckdbAnalyticsStack(app, 'DdbDuckdbAnalytics', {
  description:
    'Serverless analytics on DynamoDB: zero-ETL to S3 Tables (Iceberg) queried by DuckDB in Lambda (aws-dynamodb-examples)',
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    // Zero-ETL from DynamoDB to S3 Tables is not available in every
    // region. Deploy to a region that supports it; see the AWS Glue
    // zero-ETL documentation for the current list.
    region: process.env.CDK_DEFAULT_REGION ?? 'us-east-1',
  },
});
