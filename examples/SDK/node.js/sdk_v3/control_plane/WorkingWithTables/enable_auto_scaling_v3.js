// An example of how to create the components for autoscaling and then apply them to a DynamoDB table.
const { applicationAutoscalingClient } = require("@aws-sdk/client-application-auto-scaling");
const { IAMClient, IAM } = require("@aws-sdk/client-iam");

const iam = new AWS.IAM({ apiVersion: "2010-05-08", region: "us-west-2", logger: console });
const applicationAutoscaling = new AWS.ApplicationAutoScaling({
    apiVersion: "2016-02-06",
    region: "us-west-2",
    logger: console,
});

const tableName = "Music"; // The name of the provisioned capacity mode DynamoDB table to enable autoscaling on.
const roleName = `${tableName}TableScalingRole`; // The name of the IAM role to be created.
const policyName = `${tableName}TableScalingPolicy`; // The name of the IAM policy to be created.

const minCapacity = 1; // The minimum capacity for the auto-scaling policy
const maxCapacity = 100; // The maximum capacity for the auto-scaling policy
const readTarget = 50; // The target percentage utilization for read capacity
const writeTarget = 50; // The target percentage utilization for write capacity
const cooldownDurationSec = 150; // How long in seconds

// Construct the IAM policy document.
const assumeRolePolicyDocument = {
    Version: "2012-10-17",
    Statement: [
        {
            Effect: "Allow",
            Principal: {
                Service: ["ec2.amazonaws.com"]
            },
            Action: ["sts:AssumeRole"] },
    ],
};

// Create the permissions in JSON format that are necessary for the IAM policy.
const policyDocument = {
    Version: "2012-10-17",
    Statement: [
        {
            Effect: "Allow",
            Action: [
                "dynamodb:DescribeTable",
                "dynamodb:UpdateTable",
                "cloudwatch:PutMetricAlarm",
                "cloudwatch:DescribeAlarms",
                "cloudwatch:GetMetricStatistics",
                "cloudwatch:SetAlarmState",
                "cloudwatch:DeleteAlarms",
            ],
            Resource: "*",
        },
    ],
};

const enableAutoScaling = async () => {
    // Create the role necessary for auto-scaling
    const {
        Role: { Arn: roleArn },
    } = await iam
        .createRole({
            AssumeRolePolicyDocument: JSON.stringify(assumeRolePolicyDocument),
            RoleName: roleName,
            Description: `Table scaling role for ${tableName}`,
            MaxSessionDuration: 3600,
            Path: "/",
        })
        .promise();

    // Create the policy needed by the role
    const {
        Policy: { Arn: policyArn },
    } = await iam
        .createPolicy({
            PolicyDocument: JSON.stringify(policyDocument),
            PolicyName: policyName,
            Path: "/",
        })
        .promise();

    // Attach the policy to the role so it can be used.
    let response = await iam
        .attachRolePolicy({
            RoleName: roleName,
            PolicyArn: policyArn,
        })
        .promise();

    // Register the RCU targets for the table
    response = await applicationAutoscaling
        .registerScalableTarget({
            ServiceNamespace: "dynamodb",
            ResourceId: `table/${tableName}`,
            ScalableDimension: "dynamodb:table:ReadCapacityUnits",
            MinCapacity: minCapacity,
            MaxCapacity: maxCapacity,
            RoleARN: "arn:aws:iam::*:role/MusicTableScalingRole",
        })
        .promise();

    // Register the RCU targets for the table
    response = await applicationAutoscaling
        .registerScalableTarget({
            ServiceNamespace: "dynamodb",
            ResourceId: `table/${tableName}`,
            ScalableDimension: "dynamodb:table:WriteCapacityUnits",
            MinCapacity: minCapacity,
            MaxCapacity: maxCapacity,
            RoleARN: "arn:aws:iam::*:role/MusicTableScalingRole",
        })
        .promise();

    // Attach the Read scaling policy to the table.
    response = await applicationAutoscaling
        .putScalingPolicy({
            PolicyName: `${tableName}ScalingPolicy`,
            ServiceNamespace: "dynamodb",
            ResourceId: `table/${tableName}`,
            ScalableDimension: "dynamodb:table:ReadCapacityUnits",
            PolicyType: "TargetTrackingScaling",
            TargetTrackingScalingPolicyConfiguration: {
                TargetValue: readTarget,
                PredefinedMetricSpecification: { PredefinedMetricType: "DynamoDBReadCapacityUtilization" },
                ScaleOutCooldown: cooldownDurationSec,
                ScaleInCooldown: cooldownDurationSec,
                DisableScaleIn: true,
            },
        })
        .promise();

    // Attach the Write scaling policy to the table.
    response = await applicationAutoscaling
        .putScalingPolicy({
            PolicyName: `${tableName}ScalingPolicy`,
            ServiceNamespace: "dynamodb",
            ResourceId: `table/${tableName}`,
            ScalableDimension: "dynamodb:table:WriteCapacityUnits",
            PolicyType: "TargetTrackingScaling",
            TargetTrackingScalingPolicyConfiguration: {
                TargetValue: writeTarget,
                PredefinedMetricSpecification: { PredefinedMetricType: "DynamoDBWriteCapacityUtilization" },
                ScaleOutCooldown: cooldownDurationSec,
                ScaleInCooldown: cooldownDurationSec,
                DisableScaleIn: true,
            },
        })
        .promise();

    console.log("Autoscaling has been enabled");
};

enableAutoScaling().catch((error) => console.error(JSON.stringify(error, null, 2)));
