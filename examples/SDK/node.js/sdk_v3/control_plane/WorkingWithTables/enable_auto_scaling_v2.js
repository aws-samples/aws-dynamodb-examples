const { IAMClient, CreateRoleCommand, CreatePolicyCommand, AttachRolePolicyCommand } = require("@aws-sdk/client-iam");
const { 
  ApplicationAutoScalingClient, 
  RegisterScalableTargetCommand, 
  PutScalingPolicyCommand 
} = require("@aws-sdk/client-application-auto-scaling");

const iam = new IAMClient({ region: "us-west-2" });
const applicationAutoscaling = new ApplicationAutoScalingClient({
  region: "us-west-2",
});

const tableName = "Music";
const roleName = `${tableName}TableScalingRole`;
const policyName = `${tableName}TableScalingPolicy`;

const minCapacity = 1; // The minimum capacity for the auto-scaling policy
const maxCapacity = 100; // The maximum capacity for the auto-scaling policy
const readTarget = 50; // The target percentage utilization for read capacity
const writeTarget = 50; // The target percentage utilization for write capacity
const cooldownDurationSec = 150; // How long in seconds

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
  const createRoleCommand = new CreateRoleCommand({
    AssumeRolePolicyDocument: JSON.stringify(assumeRolePolicyDocument),
    RoleName: roleName,
    Description: `Table scaling role for ${tableName}`,
    MaxSessionDuration: 3600,
    Path: "/",
  });
  const {
    Role: { Arn: roleArn },
  } = await iam.send(createRoleCommand);

  // Create the policy needed by the role
  const createPolicyCommand = new CreatePolicyCommand({
    PolicyDocument: JSON.stringify(policyDocument),
    PolicyName: policyName,
    Path: "/",
  });
  const {
    Policy: { Arn: policyArn },
  } = await iam.send(createPolicyCommand);

  // Attach the policy to the role so it can be used.
  const attachPolicyCommand = new AttachRolePolicyCommand({
    RoleName: roleName,
    PolicyArn: policyArn,
  });
  let response = await iam.send(attachPolicyCommand);

  // Register the RCU targets for the table
  let registerCommand = new RegisterScalableTargetCommand({
    ServiceNamespace: "dynamodb",
    ResourceId: `table/${tableName}`,
    ScalableDimension: "dynamodb:table:ReadCapacityUnits",
    MinCapacity: minCapacity,
    MaxCapacity: maxCapacity,
    RoleARN: "arn:aws:iam::544500146257:role/MusicTableScalingRole",
  });
  response = await applicationAutoscaling.send(registerCommand);

  // Register the WCU targets for the table
  registerCommand = new RegisterScalableTargetCommand({
    ServiceNamespace: "dynamodb",
    ResourceId: `table/${tableName}`,
    ScalableDimension: "dynamodb:table:WriteCapacityUnits",
    MinCapacity: minCapacity,
    MaxCapacity: maxCapacity,
    RoleARN: "arn:aws:iam::544500146257:role/MusicTableScalingRole",
  });
  response = await applicationAutoscaling.send(registerCommand);

  // Attach the Read scaling policy to the table.
  let policyCommand = new PutScalingPolicyCommand({
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
  });
  response = await applicationAutoscaling.send(policyCommand);

  // Attach the Write scaling policy to the table.
  policyCommand = new PutScalingPolicyCommand({
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
  });
  response = await applicationAutoscaling.send(policyCommand);

  console.log("Autoscaling has been enabled");
};

enableAutoScaling().catch((error) => console.error(JSON.stringify(error, null, 2)));
