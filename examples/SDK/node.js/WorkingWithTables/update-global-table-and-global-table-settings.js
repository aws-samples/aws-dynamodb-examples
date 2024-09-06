const AWS = require("aws-sdk");

const dynamodb = new AWS.DynamoDB({ region: "us-west-2" });

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

  const response = await dynamodb.updateGlobalTable(params).promise();
  return response;
}

async function updateGlobalTableSettings() {
  const params = {
    GlobalTableName: tableName,
    GlobalTableProvisionedWriteCapacityUnits: "10",
  };

  const response = await dynamodb.updateGlobalTableSettings(params).promise();
  return response;
}

async function updateAll() {
  await updateGlobalTable();
  await updateGlobalTableSettings();
}

updateAll().catch((error) => console.error(JSON.stringify(error, null, 2)));
