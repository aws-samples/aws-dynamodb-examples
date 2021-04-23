// A simple script to delete a DynamoDB table. 

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
    .catch((error) => console.log("An error occured while deleting the table:" + ' ' + error.message ));