// A simple script to describe the quotas on an existing table.

const {DynamoDBClient, DescribeLimitsCommand } = require('@aws-sdk/client-dynamodb');

const REGION = "us-west-2";
const TableName = "Music"; //Change this to your table name

const dbclient = new DynamoDBClient({ region: REGION });

async function describeLimits() {
  const params = {
    TableName: TableName,
  };
  return await dbclient.send( new DescribeLimitsCommand(params));
}

describeLimits()
    .then((data) => console.log(data))
    .catch((error) => console.log("An error occured while get the table limits:" + ' ' + error.message ));
