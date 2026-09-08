import * as cdk from 'aws-cdk-lib';
import * as cr from 'aws-cdk-lib/custom-resources';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as ecrAssets from 'aws-cdk-lib/aws-ecr-assets';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import { DynamoDbZeroEtlToS3Tables } from 'dynamodb-zero-etl-s3tables';
import * as path from 'path';

export interface DdbDuckdbAnalyticsStackProps extends cdk.StackProps {
  /**
   * Name of the DynamoDB source table. The zero-ETL integration requires
   * an explicit table name.
   * @default '<stack-name>-orders'
   */
  readonly tableName?: string;

  /**
   * Name of the S3 Table Bucket that stores the Iceberg data.
   * Must be 3-63 characters, lowercase letters, numbers, and hyphens.
   * @default '<stack-name>-analytics'
   */
  readonly tableBucketName?: string;

  /**
   * Name of the Glue zero-ETL integration.
   * @default '<stack-name>-integration'
   */
  readonly integrationName?: string;
}

export class DdbDuckdbAnalyticsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: DdbDuckdbAnalyticsStackProps = {}) {
    super(scope, id, props);

    // Physical names are required by the zero-ETL construct. Deriving the
    // defaults from the stack name lets two copies of this stack coexist
    // in one account and region.
    const prefix = this.stackName.toLowerCase();
    const tableName = props.tableName ?? `${prefix}-orders`;
    const tableBucketName = props.tableBucketName ?? `${prefix}-analytics`;
    const integrationName = props.integrationName ?? `${prefix}-integration`;

    // Source table. The zero-ETL integration reads from the point-in-time
    // recovery (PITR) store, so PITR must be enabled. RemovalPolicy.DESTROY
    // keeps teardown simple for a sample; use RETAIN for real workloads.
    const table = new dynamodb.Table(this, 'OrdersTable', {
      tableName,
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Zero-ETL integration: DynamoDB -> AWS Glue -> S3 Tables (Apache
    // Iceberg). Seeds with a full export, then applies change data capture
    // on a refresh interval (15 minutes by default).
    const zeroEtl = new DynamoDbZeroEtlToS3Tables(this, 'ZeroEtl', {
      table,
      tableBucketName,
      integrationName,
    });

    const tableBucketArn = zeroEtl.tableBucket.attrTableBucketArn;

    // The integration creates namespaces and Iceberg tables inside the
    // bucket out-of-band, and DeleteTableBucket refuses while they exist,
    // which would leave `cdk destroy` in DELETE_FAILED. This custom
    // resource empties the bucket on stack deletion, after the
    // integration itself has been removed.
    const emptyBucketFn = new lambda.Function(this, 'EmptyTableBucketFn', {
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '..', 'lambda-cleanup')),
      timeout: cdk.Duration.minutes(5),
      logGroup: new logs.LogGroup(this, 'EmptyTableBucketFnLogs', {
        retention: logs.RetentionDays.ONE_WEEK,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }),
    });
    emptyBucketFn.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        's3tables:ListNamespaces',
        's3tables:ListTables',
        's3tables:DeleteTable',
        's3tables:DeleteNamespace',
      ],
      resources: [tableBucketArn, `${tableBucketArn}/table/*`],
    }));
    const emptyBucketProvider = new cr.Provider(this, 'EmptyTableBucketProvider', {
      onEventHandler: emptyBucketFn,
      logGroup: new logs.LogGroup(this, 'EmptyTableBucketProviderLogs', {
        retention: logs.RetentionDays.ONE_WEEK,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }),
    });
    const emptyBucket = new cdk.CustomResource(this, 'EmptyTableBucketOnDelete', {
      serviceToken: emptyBucketProvider.serviceToken,
      properties: { TableBucketArn: tableBucketArn },
    });
    // Delete order: integration first (stops new writes), then this
    // custom resource (empties the bucket), then the bucket itself.
    emptyBucket.node.addDependency(zeroEtl);

    // DuckDB query engine, packaged as a container image with the httpfs,
    // aws, avro, and iceberg extensions baked in at build time so cold
    // starts never download extensions (the Lambda filesystem outside /tmp
    // is read-only, so a runtime download would fail anyway). The image
    // platform is pinned so builds on arm64 hosts (Apple silicon) still
    // produce an x86_64 image matching the function architecture.
    const queryFn = new lambda.DockerImageFunction(this, 'DuckDbQueryFn', {
      code: lambda.DockerImageCode.fromImageAsset(
        path.join(__dirname, '..', 'lambda'),
        { platform: ecrAssets.Platform.LINUX_AMD64 },
      ),
      memorySize: 3008, // Lambda allocates CPU proportionally to memory
      timeout: cdk.Duration.minutes(2),
      ephemeralStorageSize: cdk.Size.gibibytes(2), // DuckDB spill space
      architecture: lambda.Architecture.X86_64,
      environment: {
        TABLE_BUCKET_ARN: tableBucketArn,
      },
      logGroup: new logs.LogGroup(this, 'DuckDbQueryFnLogs', {
        retention: logs.RetentionDays.ONE_WEEK,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }),
    });

    // Read-only access to the S3 Tables bucket: catalog metadata through
    // the S3 Tables Iceberg REST endpoint, and the underlying Parquet data
    // through the S3 Tables data plane.
    queryFn.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        's3tables:GetTableBucket',
        's3tables:ListNamespaces',
        's3tables:GetNamespace',
        's3tables:ListTables',
        's3tables:GetTable',
        's3tables:GetTableMetadataLocation',
        's3tables:GetTableData',
      ],
      resources: [tableBucketArn, `${tableBucketArn}/table/*`],
    }));

    // HTTPS endpoint with IAM authorization: callers sign requests with
    // SigV4 and need lambda:InvokeFunctionUrl on this function. Do not
    // change this to FunctionUrlAuthType.NONE; that would expose the
    // query engine to the internet.
    const fnUrl = queryFn.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.AWS_IAM,
    });

    new cdk.CfnOutput(this, 'FunctionUrl', { value: fnUrl.url });
    new cdk.CfnOutput(this, 'TableBucketArn', { value: tableBucketArn });
    new cdk.CfnOutput(this, 'TableName', { value: table.tableName });
    new cdk.CfnOutput(this, 'QueryFunctionName', { value: queryFn.functionName });
  }
}
