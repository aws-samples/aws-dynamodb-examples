const { DynamoDBClient, DescribeGlobalTableCommand, DescribeGlobalTableSettingsCommand } = require("@aws-sdk/client-dynamodb");

const dynamodb = new DynamoDBClient({ region: "us-west-2" });

const tableName = "Music";

// Note: This method only applies to Version 2017.11.29 of global tables.
async function describeGlobalTable() {
  const params = {
    GlobalTableName: tableName,
  };

  const command = new DescribeGlobalTableCommand(params);
  const response = await dynamodb.send(command);
  return response;
}

// Note: This method only applies to Version 2017.11.29 of global tables.
async function describeGlobalTableSettings() {
  const params = {
    GlobalTableName: tableName,
  };

  const command = new DescribeGlobalTableSettingsCommand(params);
  const response = await dynamodb.send(command);
  return response;
}

async function describeAll() {
  const information = await describeGlobalTable();
  console.log(JSON.stringify(information, null, 2));

  const settings = await describeGlobalTableSettings();
  console.log(JSON.stringify(settings, null, 2));
}

describeAll().catch((error) => console.error(JSON.stringify(error, null, 2)));
