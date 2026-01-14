import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as glue from "aws-cdk-lib/aws-glue";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as stepfunctions from "aws-cdk-lib/aws-stepfunctions";
import * as tasks from "aws-cdk-lib/aws-stepfunctions-tasks";
import * as s3assets from "aws-cdk-lib/aws-s3-assets";
import * as cr from "aws-cdk-lib/custom-resources";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as path from "path";
import { Construct } from "constructs";

interface DdbMigrationStackProps extends cdk.StackProps {
  sourceTableArn: string;
  sourceTableName: string;
  destinationTableArn: string;
  destinationTableName: string;
}

export class DdbMigrationStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: DdbMigrationStackProps) {
    super(scope, id, props);

    const sanitizedStackName = this.stackName
      .replace(/[^a-zA-Z0-9-_]/g, "-")
      .substring(0, 80); // AWS Step Functions name has a limit of 80 characters

    const destinationAccountId = cdk.Fn.select(
      4,
      cdk.Fn.split(":", props.destinationTableArn)
    );
    // Block x-account source table
    const sourceAccountId = cdk.Fn.select(
      4,
      cdk.Fn.split(":", props.sourceTableArn)
    );
    const validationFunction = new lambda.Function(
      this,
      "AccountValidationFunction",
      {
        runtime: lambda.Runtime.PYTHON_3_9,
        handler: "index.lambda_handler",
        code: lambda.Code.fromAsset("lib/account-check"),
        timeout: cdk.Duration.seconds(30),
      }
    );
    validationFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["sts:GetCallerIdentity"],
        resources: ["*"],
      })
    );
    const customResource = new cdk.CustomResource(
      this,
      "AccountValidationCustomResource",
      {
        serviceToken: validationFunction.functionArn,
        properties: {
          SourceAccountId: sourceAccountId,
        },
      }
    );
    // END Block x-account source table
    // Create S3 bucket for migration data
    const migrationBucket = new s3.Bucket(this, "MigrationBucket", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
    });

    // Create S3 assets for Glue scripts
    const directMigrationScript = new s3assets.Asset(
      this,
      "DirectMigrationScript",
      {
        path: path.join(__dirname, "../glue-scripts/direct-migration.py"),
      }
    );

    const largeMigrationScript = new s3assets.Asset(
      this,
      "LargeMigrationScript",
      {
        path: path.join(__dirname, "../glue-scripts/large-migration.py"),
      }
    );

    // Create Dead Letter Queue (DLQ)
    const deadLetterQueue = new sqs.Queue(this, "DeadLetterQueue", {
      queueName: `cdc-${props.sourceTableName}-to-${props.destinationTableName}-dlq.fifo`,
      fifo: true,
      contentBasedDeduplication: true,
    });

    // Create FIFO Queue with DLQ
    const changeDataCaptureFifo = new sqs.Queue(this, "ChangeDataCaptureFifo", {
      queueName: `cdc-${props.sourceTableName}-to-${props.destinationTableName}.fifo`,
      fifo: true,
      contentBasedDeduplication: true,
      deadLetterQueue: {
        queue: deadLetterQueue,
        maxReceiveCount: 3,
      },
    });

    // Create Stream Processor Lambda
    const streamProcessorLambda = new lambda.Function(
      this,
      "StreamProcessorLambda",
      {
        runtime: lambda.Runtime.PYTHON_3_12, // or whichever runtime you're using
        handler: "index.handler",
        code: lambda.Code.fromAsset("lambda/stream-processor"),
        environment: {
          SQS_FIFO_QUEUE_URL: changeDataCaptureFifo.queueUrl,
          SQS_DLQ_URL: deadLetterQueue.queueUrl,
        },
      }
    );

    // Grant the stream processor Lambda permission to send messages to both queues
    changeDataCaptureFifo.grantSendMessages(streamProcessorLambda);
    deadLetterQueue.grantSendMessages(streamProcessorLambda);

    // Lambda function to check table size and setup
    const setupCheckLambda = new lambda.Function(this, "SetupCheckLambda", {
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: "index.handler",
      code: lambda.Code.fromAsset("lambda/setup-check"),
      timeout: cdk.Duration.minutes(5),
      environment: {
        STREAM_PROCESSOR_FUNCTION_NAME: streamProcessorLambda.functionName,
      },
    });

    const writeCdcLambda = new lambda.Function(this, "WriteCdcLambda", {
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: "index.handler",
      code: lambda.Code.fromAsset("lambda/write-cdc"),
      environment: {
        DESTINATION_TABLE_NAME: props.destinationTableName,
        SQS_FIFO_QUEUE_URL: changeDataCaptureFifo.queueUrl,
        SQS_DLQ_URL: deadLetterQueue.queueUrl,
      },
    });

    writeCdcLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["dynamodb:PutItem", "dynamodb:BatchWriteItem"],
        resources: [props.destinationTableArn],
      })
    );

    const enableTriggerLambda = new lambda.Function(
      this,
      "EnableTriggerLambda",
      {
        runtime: lambda.Runtime.PYTHON_3_12,
        handler: "index.handler",
        code: lambda.Code.fromAsset("lambda/enable-trigger"),
        environment: {
          FIFO_QUEUE_ARN: changeDataCaptureFifo.queueArn,
          WRITE_CDC_FUNCTION_NAME: writeCdcLambda.functionName,
        },
      }
    );

    // Grant permissions to create event source mapping
    enableTriggerLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["lambda:CreateEventSourceMapping"],
        resources: ["*"],
      })
    );

    // Grant permissions to read from the FIFO queue
    changeDataCaptureFifo.grantConsumeMessages(writeCdcLambda);

    // Create Glue role with necessary permissions
    const glueRole = new iam.Role(this, "GlueJobRole", {
      assumedBy: new iam.ServicePrincipal("glue.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AWSGlueServiceRole"
        ),
      ],
    });
    // Add custom permissions to Glue role
    glueRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          "dynamodb:DescribeTable",
          "dynamodb:Scan",
          "dynamodb:Query",
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:BatchWriteItem",
          "dynamodb:ExportTableToPointInTime",
        ],
        resources: [props.sourceTableArn, props.destinationTableArn],
      })
    );
    // Add separate policy statement for actions that require "*" as resource
    glueRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["dynamodb:DescribeExport", "dynamodb:ListExports"],
        resources: ["*"],
      })
    );
    // Add S3 permissions for Glue role
    glueRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket",
        ],
        resources: [
          migrationBucket.bucketArn,
          `${migrationBucket.bucketArn}/*`,
          directMigrationScript.bucket.bucketArn,
          `${directMigrationScript.bucket.bucketArn}/*`,
          largeMigrationScript.bucket.bucketArn,
          `${largeMigrationScript.bucket.bucketArn}/*`,
        ],
      })
    );

    // Create Glue jobs for both scenarios
    const directMigrationJob = new glue.CfnJob(this, "DirectMigrationJob", {
      role: glueRole.roleArn,
      command: {
        name: "glueetl",
        pythonVersion: "3",
        scriptLocation: directMigrationScript.s3ObjectUrl,
      },
      defaultArguments: {
        "--enable-metrics": "",
        "--enable-continuous-cloudwatch-log": "true",
        "--source_table_arn": props.sourceTableArn,
        "--destination_table_arn": props.destinationTableArn,
        "--job-language": "python",
        "--job-bookmark-option": "job-bookmark-disable",
        "--TempDir": `s3://${migrationBucket.bucketName}/temporary/`,
      },
      executionProperty: {
        maxConcurrentRuns: 1,
      },
      glueVersion: "3.0",
      numberOfWorkers: 2,
      workerType: "G.1X",
      timeout: 60,
    });

    const largeMigrationJob = new glue.CfnJob(this, "LargeMigrationJob", {
      role: glueRole.roleArn,
      command: {
        name: "glueetl",
        pythonVersion: "3",
        scriptLocation: largeMigrationScript.s3ObjectUrl,
      },
      defaultArguments: {
        "--enable-metrics": "",
        "--enable-continuous-cloudwatch-log": "true",
        "--source_table_arn": props.sourceTableArn,
        "--destination_table": props.destinationTableArn.split("/")[1],
        "--migration_bucket": migrationBucket.bucketName,
        "--account_id": cdk.Stack.of(this).account,
        "--job-language": "python",
        "--job-bookmark-option": "job-bookmark-disable",
        "--TempDir": `s3://${migrationBucket.bucketName}/temporary/`,
      },
      executionProperty: {
        maxConcurrentRuns: 1,
      },
      glueVersion: "3.0",
      numberOfWorkers: 10,
      workerType: "G.2X",
      timeout: 720,
    });

    const checkTableSizeAndSetup = new tasks.LambdaInvoke(
      this,
      "Check Table Size and Setup",
      {
        lambdaFunction: setupCheckLambda,
        resultPath: "$.setup",
        retryOnServiceExceptions: true,
        payload: stepfunctions.TaskInput.fromObject({
          tableArn: props.sourceTableArn,
        }),
      }
    );

    const directMigrationTask = new tasks.GlueStartJobRun(
      this,
      "Direct Migration",
      {
        glueJobName: directMigrationJob.ref,
        integrationPattern: stepfunctions.IntegrationPattern.RUN_JOB,
        resultPath: "$.migrationResult",
      }
    );

    const largeMigrationTask = new tasks.GlueStartJobRun(
      this,
      "Large Table Migration",
      {
        glueJobName: largeMigrationJob.ref,
        integrationPattern: stepfunctions.IntegrationPattern.RUN_JOB,
        resultPath: "$.migrationResult",
      }
    );

    const enableTriggerDirect = new tasks.LambdaInvoke(
      this,
      "Enable FIFO Trigger Direct",
      {
        lambdaFunction: enableTriggerLambda,
        resultPath: "$.triggerResult",
        payload: stepfunctions.TaskInput.fromObject({
          migrationTime: stepfunctions.JsonPath.stringAt(
            "$.setup.Payload.exportTime"
          ),
        }),
      }
    );

    const enableTriggerLarge = new tasks.LambdaInvoke(
      this,
      "Enable FIFO Trigger Large",
      {
        lambdaFunction: enableTriggerLambda,
        resultPath: "$.triggerResult",
        payload: stepfunctions.TaskInput.fromObject({
          migrationTime: stepfunctions.JsonPath.stringAt(
            "$.setup.Payload.exportTime"
          ),
        }),
      }
    );

    const finalSuccess = new stepfunctions.Succeed(this, "Process Completed");

    // Build the migration paths
    const largeMigrationPath = largeMigrationTask
      .next(enableTriggerLarge)
      .next(finalSuccess);

    const directMigrationPath = directMigrationTask
      .next(enableTriggerDirect)
      .next(finalSuccess);

    const migrationChoice = new stepfunctions.Choice(this, "Migration Path")
      .when(
        stepfunctions.Condition.booleanEquals(
          "$.setup.Payload.isLargeTable",
          true
        ),
        largeMigrationPath
      )
      .otherwise(directMigrationPath);

    // Build the main workflow
    const definition = checkTableSizeAndSetup.next(migrationChoice);

    const stateMachine = new stepfunctions.StateMachine(
      this,
      "MigrationStateMachine",
      {
        stateMachineName: sanitizedStackName,
        definition,
        timeout: cdk.Duration.hours(48),
        tracingEnabled: true,
        logs: {
          destination: new cdk.aws_logs.LogGroup(this, "MigrationLogGroup", {
            retention: cdk.aws_logs.RetentionDays.ONE_WEEK,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
          }),
          level: stepfunctions.LogLevel.ALL,
        },
      }
    );

    // Grant necessary permissions
    const sourceTable = cdk.aws_dynamodb.Table.fromTableArn(
      this,
      "SourceTable",
      props.sourceTableArn
    );
    sourceTable.grantReadData(setupCheckLambda);
    setupCheckLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          "lambda:CreateEventSourceMapping",
          "dynamodb:DescribeContinuousBackups",
        ],
        resources: ["*"],
      })
    );

    streamProcessorLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          "dynamodb:DescribeStream",
          "dynamodb:GetRecords",
          "dynamodb:GetShardIterator",
          "dynamodb:ListStreams",
        ],
        resources: [`${props.sourceTableArn}/stream/*`, props.sourceTableArn],
      })
    );

    // Make and output a RBP for the destination DynamoDB table if this is x-account
    if (destinationAccountId !== sourceAccountId) {
      const dynamoDbRbp = {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Action: [
              "dynamodb:PutItem",
              "dynamodb:BatchWriteItem",
              "dynamodb:DescribeTable",
            ],
            Principal: {
              AWS: [glueRole.roleArn, writeCdcLambda.role!.roleArn],
            },
            Resource: props.destinationTableArn,
          },
        ],
      };

      // Output the policy for the user to apply to the destination table
      new cdk.CfnOutput(this, "DestinationTablePolicy", {
        value: JSON.stringify(dynamoDbRbp, null, 2),
        description:
          "Copy this policy and add it to the destination table as a resource-based policy.",
      });
    }
    // Outputs
    new cdk.CfnOutput(this, "StateMachineArn", {
      value: stateMachine.stateMachineArn,
      description: "Migration State Machine ARN",
    });

    new cdk.CfnOutput(this, "MigrationBucketName", {
      value: migrationBucket.bucketName,
      description: "Migration Bucket Name",
    });

    new cdk.CfnOutput(this, "DirectMigrationJobName", {
      value: directMigrationJob.ref,
      description: "Direct Migration Glue Job Name",
    });

    new cdk.CfnOutput(this, "LargeMigrationJobName", {
      value: largeMigrationJob.ref,
      description: "Large Migration Glue Job Name",
    });
  }
}
