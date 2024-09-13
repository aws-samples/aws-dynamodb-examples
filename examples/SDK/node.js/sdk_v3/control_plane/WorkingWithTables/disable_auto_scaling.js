const AWS = require("aws-sdk");

const applicationAutoscaling = new AWS.ApplicationAutoScaling({
  apiVersion: "2016-02-06",
  region: "us-west-2",
  logger: console,
});

const tableName = "Music"; // Add the name of the DynamoDB table you want to add auto-scaling to between the double quotes.

const disableAutoScaling = async () => {
  // Attach the Read scaling policy to the table.
  let response = await applicationAutoscaling
    .deleteScalingPolicy({
      PolicyName: `${tableName}ScalingPolicy`,
      ServiceNamespace: "dynamodb",
      ResourceId: `table/${tableName}`,
      ScalableDimension: "dynamodb:table:ReadCapacityUnits",
    })
    .promise();

  response = await applicationAutoscaling
    .deleteScalingPolicy({
      PolicyName: `${tableName}ScalingPolicy`,
      ServiceNamespace: "dynamodb",
      ResourceId: `table/${tableName}`,
      ScalableDimension: "dynamodb:table:WriteCapacityUnits",
    })
    .promise();

  // Register the RCU targets for the table
  response = await applicationAutoscaling
    .deregisterScalableTarget({
      ServiceNamespace: "dynamodb",
      ResourceId: `table/${tableName}`,
      ScalableDimension: "dynamodb:table:ReadCapacityUnits",
    })
    .promise();

  // Register the RCU targets for the table
  response = await applicationAutoscaling
    .deregisterScalableTarget({
      ServiceNamespace: "dynamodb",
      ResourceId: `table/${tableName}`,
      ScalableDimension: "dynamodb:table:WriteCapacityUnits",
    })
    .promise();

  console.log("Autoscaling has been disabled");
};

disableAutoScaling().catch((error) => console.error(JSON.stringify(error, null, 2)));
