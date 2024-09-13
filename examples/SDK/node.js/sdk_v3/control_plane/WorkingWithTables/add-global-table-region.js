//const AWS = require("aws-sdk");

//const dynamodb = new AWS.DynamoDB({ region: "us-west-2" });
const { DynamoDBClient, UpdateTableCommand, UpdateGlobalTableCommand } = require('@aws-sdk/client-dynamodb');

const REGION = "us-west-2";
//const TABLENAME = "RetailDatabase";

async function addGlobalTableRegion() {
  const params = {
    TableName: "RetailDatabase",
    ReplicaUpdates: [
      {
        Create: {
          RegionName: "ap-northeast-2",
        },
      },
    ],
  };

  const dbclient = new DynamoDBClient({ region: REGION });

  return await dbclient.send( new UpdateTableCommand(params));

}

addGlobalTableRegion()
  .then((data) => console.log(JSON.stringify(data, null, 2)))
  .catch((error) => console.error(JSON.stringify(error, null, 2)));
