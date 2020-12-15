const AWS = require("aws-sdk");

const dynamodb = new AWS.DynamoDB({ region: "us-west-2" });

const updateTable = async () => {
  const response = await dynamodb
    .updateTable({
      BillingMode: "PROVISIONED",
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 10,
      },
      TableName: "Music", // Substitute your table name for "Music"
    })
    .promise();

  await dynamodb.waitFor("tableExists", { TableName: "Music" }).promise();
  console.log("Table has been updated");
};

updateTable().catch((error) => console.error(JSON.stringify(error, null, 2)));
