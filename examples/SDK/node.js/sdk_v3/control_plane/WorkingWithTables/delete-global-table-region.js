const { DynamoDBClient, UpdateTableCommand } = require("@aws-sdk/client-dynamodb");

const dynamodb = new DynamoDBClient({ region: "us-west-2" });

const tableName = "Music";

async function deleteGlobalTableRegion() {
  const params = {
    TableName: tableName,
    ReplicaUpdates: [
      {
        Delete: {
          RegionName: "ap-northeast-2",
        },
      },
    ],
  };

  const command = new UpdateTableCommand(params);
  const response = await dynamodb.send(command);
  return response;
}

deleteGlobalTableRegion()
  .then((data) => console.log(JSON.stringify(data, null, 2)))
  .catch((error) => console.error(JSON.stringify(error, null, 2)));
