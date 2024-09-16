const AWS = require("aws-sdk");

const dynamodb = new AWS.DynamoDB({ region: "us-west-2" });

const tableName = "Music";

// Note: This method only applies to Version 2017.11.29 of global tables.
async function describeGlobalTable() {
  const params = {
    GlobalTableName: tableName,
  };

  const response = await dynamodb.describeGlobalTable(params).promise();
  return response;
}

// Note: This method only applies to Version 2017.11.29 of global tables.
async function describeGlobalTableSettings() {
  const params = {
    GlobalTableName: tableName,
  };

  const response = await dynamodb.describeGlobalTableSettings(params).promise();
  return response;
}

async function describeAll() {
  const information = await describeGlobalTable();
  console.log(JSON.stringify(information, null, 2));

  const settings = await describeGlobalTableSettings();
  console.log(JSON.stringify(settings, null, 2));
}

describeAll().catch((error) => console.error(JSON.stringify(error, null, 2)));
