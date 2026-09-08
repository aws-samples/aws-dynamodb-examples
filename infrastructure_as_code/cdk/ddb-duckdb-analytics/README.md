# Serverless analytics on DynamoDB with zero-ETL and DuckDB

This example deploys a complete serverless analytics pipeline for Amazon DynamoDB data. A zero-ETL integration continuously replicates a DynamoDB table into Apache Iceberg tables on Amazon S3 Tables, and an AWS Lambda function running DuckDB serves SQL queries over that data through an IAM-authorized function URL.

```
┌────────────┐  zero-ETL   ┌─────────────┐   ATTACH    ┌──────────────┐  HTTPS   ┌────────┐
│  DynamoDB  │────────────▶│  S3 Tables  │◀────────────│    Lambda    │◀─────────│ Caller │
│   table    │  (AWS Glue) │  (Iceberg)  │  Iceberg    │   (DuckDB)   │  SigV4   │        │
└────────────┘             └─────────────┘  REST       └──────────────┘          └────────┘
```

Transactional traffic stays on DynamoDB. Analytical queries run against the Iceberg copy, so they consume no read capacity from the table and cannot affect application latency.

## What gets deployed

| Resource | Purpose |
|----------|---------|
| DynamoDB table | Source table with point-in-time recovery (PITR) enabled |
| Zero-ETL integration | Managed replication into Iceberg, seeded by a full export, then change data capture on a refresh interval (15 minutes by default; see the [AWS Glue zero-ETL documentation](https://docs.aws.amazon.com/glue/latest/dg/zero-etl-using.html)). Created by the [dynamodb-zero-etl-s3tables](https://www.npmjs.com/package/dynamodb-zero-etl-s3tables) CDK construct, authored by this sample's maintainer |
| S3 Table Bucket | Iceberg-native storage with automatic compaction and maintenance |
| Lambda function | DuckDB packaged as a container image with the `httpfs`, `aws`, `avro`, and `iceberg` extensions baked in |
| Function URL | HTTPS endpoint with `AWS_IAM` authorization |

## Prerequisites

- Node.js 20 or later and Docker (the Lambda image builds locally)
- AWS CDK v2 bootstrapped in the target account and region
- Python 3.9 or later with `boto3` 1.35.74 or later for the helper scripts (`pip install -r scripts/requirements.txt`; older boto3 releases predate the `s3tables` client)

## Deploy

```bash
npm install
npx cdk deploy
```

The deployment finishes in a few minutes. Note the `FunctionUrl`, `TableName`, and `TableBucketArn` outputs.

Physical resource names (table, table bucket, integration) default to values derived from the stack name, so two copies of the stack can coexist in one account and region. All three are overridable through stack props. Deploy to a region that supports zero-ETL from DynamoDB to S3 Tables; see the AWS Glue zero-ETL documentation for the current list.

## Seed sample data

Write sample orders into the source table. The script resolves the table name from the stack's `TableName` output (override with the `TABLE_NAME` environment variable):

```bash
python3 scripts/seed.py 500
```

The integration seeds the Iceberg table with an initial export, which takes 15 to 30 minutes after deployment. Check progress with:

```bash
python3 scripts/status.py
```

When a namespace and table appear, the data is queryable.

## Query

Send SQL to the function URL. Requests must be SigV4-signed; the helper script signs them with your current credentials:

```bash
python3 scripts/invoke.py "SHOW ALL TABLES"

python3 scripts/invoke.py "
  SELECT category, round(sum(amount), 2) AS revenue
  FROM analytics.<namespace>.<table>
  GROUP BY category
  ORDER BY revenue DESC"
```

Replace `<namespace>` and `<table>` with the values printed by `status.py`. The zero-ETL integration flattens top-level DynamoDB attributes into typed Iceberg columns, so queries use plain column names (`amount`, `category`), not DynamoDB JSON type wrappers.

New writes to the DynamoDB table appear in query results after the next refresh interval with no further action.

## How the Lambda works

- The container image installs DuckDB and its extensions at build time. Lambda's filesystem outside `/tmp` is read-only, so extensions cannot be downloaded at runtime; baking them in also keeps cold starts short (measured at about 3 seconds cold and about 400 ms warm for a GROUP BY over the sample data, at 3008 MB memory in us-east-1).
- The DuckDB connection and the `ATTACH` to the S3 Tables catalog happen at module load, outside the handler, so warm invocations skip setup.
- Credentials come from the Lambda execution role through DuckDB's `credential_chain` provider. The role has read-only access to the one table bucket.
- After setup the configuration is locked: local filesystem access is disabled, extension loading is turned off, and the catalog is attached read-only. A query can read the Iceberg tables and nothing else.
- Responses are capped at 10,000 rows (configurable through the `MAX_ROWS` environment variable), which helps keep responses inside the 6 MB function URL response limit.

## Costs

The main cost drivers while the stack runs, per the [DynamoDB pricing page](https://aws.amazon.com/dynamodb/pricing/on-demand/):

- PITR on the source table ($0.20 per GB-month in us-east-1)
- The integration's initial seed, billed as a full export ($0.10 per GB in us-east-1)
- Ongoing replication, billed as "CDC with AWS Glue": one CDC unit per write up to 1 KB ($0.10 per million CDC units in us-east-1)
- S3 Tables storage, requests, compaction, and maintenance
- Lambda invocations and CloudWatch Logs

There is no per-GB scan charge on queries: each query is billed as S3 Tables requests plus the Lambda invocation itself.

## Clean up

```bash
npx cdk destroy
```

The zero-ETL integration creates namespaces and Iceberg tables inside the table bucket outside of CloudFormation, and `DeleteTableBucket` refuses while they exist. The stack includes a custom resource that empties the bucket during deletion, so `cdk destroy` completes in one pass. The DynamoDB table is deleted because this sample sets `RemovalPolicy.DESTROY`.

S3 Tables holds a deleted bucket's name in a transitional state for a period after deletion. If you destroy the stack and immediately redeploy it under the same name, bucket creation can fail with a 409 conflict; wait and retry, or deploy under a different stack name.

## Security notes

- The function URL uses `AWS_IAM` authorization. Callers need both `lambda:InvokeFunctionUrl` and `lambda:InvokeFunction` on the function (function URLs created since October 2025 require both) and must sign requests with SigV4. Do not switch the URL to `NONE` auth: the endpoint executes SQL.
- The Lambda role grants read-only S3 Tables actions scoped to the one table bucket.
- The endpoint accepts arbitrary SQL by design (it is a query engine). The DuckDB configuration lockdown limits the blast radius to reads of the attached catalog. If you expose this pattern to callers who should not write arbitrary SQL, put an allowlist of named queries in front of it.
