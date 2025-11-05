const { ApplicationAutoScalingClient, RegisterScalableTargetCommand } = require("@aws-sdk/client-application-auto-scaling");

const applicationAutoscaling = new ApplicationAutoScalingClient({
  region: "us-west-2",
});

const minCapacity = 1; // The minimum capacity for the auto-scaling policy
const maxCapacity = 100; // The maximum capacity for the auto-scaling policy
const readTarget = 50; // The target percentage utilization for read capacity
const writeTarget = 50; // The target percentage utilization for write capacity
const cooldownDurationSec = 150; // How long in seconds
const tableName = "Music";

const updateAutoScaling = async () => {
  // Register the RCU targets for the table
  let command = new RegisterScalableTargetCommand({
    ServiceNamespace: "dynamodb",
    ResourceId: `table/${tableName}`,
    ScalableDimension: "dynamodb:table:ReadCapacityUnits",
    MinCapacity: minCapacity,
    MaxCapacity: maxCapacity,
    RoleARN: "arn:aws:iam::544500146257:role/MusicTableScalingRole",
  });
  let response = await applicationAutoscaling.send(command);

  // Register the WCU targets for the table
  command = new RegisterScalableTargetCommand({
    ServiceNamespace: "dynamodb",
    ResourceId: `table/${tableName}`,
    ScalableDimension: "dynamodb:table:WriteCapacityUnits",
    MinCapacity: minCapacity,
    MaxCapacity: maxCapacity,
    RoleARN: "arn:aws:iam::544500146257:role/MusicTableScalingRole",
  });
  response = await applicationAutoscaling.send(command);

  console.log("Autoscaling has been updated");
};

updateAutoScaling().catch((error) => console.error(JSON.stringify(error, null, 2)));
