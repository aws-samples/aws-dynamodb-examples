const { DynamoDBClient, UpdateGlobalTableCommand, UpdateGlobalTableSettingsCommand } = require("@aws-sdk/client-dynamodb");

const dynamodb = new DynamoDBClient({ region: "us-west-2" });

const tableName = "Music";

// Before using this method, you must create the table in the region.
async function updateGlobalTable() {
  const params = {
    GlobalTableName: tableName,
    ReplicaUpdates: [
      {
        Create: {
          RegionName: "us-east-1",
        },
      },
    ],
  };

  const command = new UpdateGlobalTableCommand(params);
  const response = await dynamodb.send(command);
  return response;
}

async function updateGlobalTableSettings() {
  const params = {
    GlobalTableName: tableName,
    GlobalTableProvisionedWriteCapacityUnits: "10",
  };

  const command = new UpdateGlobalTableSettingsCommand(params);
  const response = await dynamodb.send(command);
  return response;
}

async function updateAll() {
  await updateGlobalTable();
  await updateGlobalTableSettings();
}

updateAll().catch((error) => console.error(JSON.stringify(error, null, 2)));
