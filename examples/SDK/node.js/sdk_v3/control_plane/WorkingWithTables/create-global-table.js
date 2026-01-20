const { DynamoDBClient, CreateGlobalTableCommand } = require("@aws-sdk/client-dynamodb");

const dynamodb = new DynamoDBClient({ region: "us-west-2" });

const tableName = "Music";

// Note: This method only applies to Version 2017.11.29 of global tables.
// Before using this method, you must create the table in both regions.
async function createGlobalTable() {
  const params = {
    GlobalTableName: tableName,
    ReplicationGroup: [
      { RegionName: "us-west-2" },
      { RegionName: "ap-northeast-2" },
    ],
  };

  const command = new CreateGlobalTableCommand(params);
  const response = await dynamodb.send(command);
  return response;
}

createGlobalTable()
  .then((data) => console.log(JSON.stringify(data, null, 2)))
  .catch((error) => console.error(JSON.stringify(error, null, 2)));
