const { applicationAutoscalingClient } = require("@aws-sdk/client-application-auto-scaling");
const { IAMClient, IAM } = require("@aws-sdk/client-iam");

const AWS = require("aws-sdk");

const applicationAutoscaling = new AWS.ApplicationAutoScaling({
  apiVersion: "2016-02-06",
  region: "us-west-2",
  logger: console,
});

const minCapacity = 1; // The minimum capacity for the auto-scaling policy
const maxCapacity = 100; // The maximum capacity for the auto-scaling policy
const readTarget = 50; // The target percentage utilization for read capacity
const writeTarget = 50; // The target percentage utilization for write capacity
const cooldownDurationSec = 150; // How long in seconds
const tableName = "Music";

const updateAutoScaling = async () => {
  // Register the RCU targets for the table
  response = await applicationAutoscaling
    .registerScalableTarget({
      ServiceNamespace: "dynamodb",
      ResourceId: `table/${tableName}`,
      ScalableDimension: "dynamodb:table:ReadCapacityUnits",
      MinCapacity: minCapacity,
      MaxCapacity: maxCapacity,
      RoleARN: "arn:aws:iam::544500146257:role/MusicTableScalingRole",
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
      RoleARN: "arn:aws:iam::544500146257:role/MusicTableScalingRole",
    })
    .promise();

  console.log("Autoscaling has been updated");
};

updateAutoScaling().catch((error) => console.error(JSON.stringify(error, null, 2)));
