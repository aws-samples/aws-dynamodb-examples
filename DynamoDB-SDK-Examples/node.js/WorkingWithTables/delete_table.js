// A simple script to delete a DynamoDB table.

// Be advised that when you delete a table, it does not delete auto-scaling info (e.g. scalable
// targets, scaling policies) or CloudWatch alarms. This must be done in seperate calls.

const { DynamoDBClient, DeleteTableCommand } = require('@aws-sdk/client-dynamodb');

const REGION = "us-west-2";
const TableName = "Music";

const dbclient = new DynamoDBClient({ region: REGION });

async function deleteTable() {
  const params = {
    TableName: TableName,
  };
  return await dbclient.send( new DeleteTableCommand(params));
}

deleteTable()
    .then((data) => console.log(data))
    .catch((error) => console.log("An error occurred while deleting the table:" + ' ' + error.message ));
