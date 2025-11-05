const { 
  ApplicationAutoScalingClient, 
  DeleteScalingPolicyCommand, 
  DeregisterScalableTargetCommand 
} = require("@aws-sdk/client-application-auto-scaling");

const applicationAutoscaling = new ApplicationAutoScalingClient({
  region: "us-west-2",
});

const tableName = "Music"; // Add the name of the DynamoDB table you want to add auto-scaling to between the double quotes.

const disableAutoScaling = async () => {
  // Delete the Read scaling policy from the table.
  let command = new DeleteScalingPolicyCommand({
    PolicyName: `${tableName}ScalingPolicy`,
    ServiceNamespace: "dynamodb",
    ResourceId: `table/${tableName}`,
    ScalableDimension: "dynamodb:table:ReadCapacityUnits",
  });
  let response = await applicationAutoscaling.send(command);

  command = new DeleteScalingPolicyCommand({
    PolicyName: `${tableName}ScalingPolicy`,
    ServiceNamespace: "dynamodb",
    ResourceId: `table/${tableName}`,
    ScalableDimension: "dynamodb:table:WriteCapacityUnits",
  });
  response = await applicationAutoscaling.send(command);

  // Deregister the RCU targets for the table
  command = new DeregisterScalableTargetCommand({
    ServiceNamespace: "dynamodb",
    ResourceId: `table/${tableName}`,
    ScalableDimension: "dynamodb:table:ReadCapacityUnits",
  });
  response = await applicationAutoscaling.send(command);

  // Deregister the WCU targets for the table
  command = new DeregisterScalableTargetCommand({
    ServiceNamespace: "dynamodb",
    ResourceId: `table/${tableName}`,
    ScalableDimension: "dynamodb:table:WriteCapacityUnits",
  });
  response = await applicationAutoscaling.send(command);

  console.log("Autoscaling has been disabled");
};

disableAutoScaling().catch((error) => console.error(JSON.stringify(error, null, 2)));
