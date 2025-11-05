const { DynamoDBClient, DescribeTableCommand } = require("@aws-sdk/client-dynamodb");

const dynamodb = new DynamoDBClient({ region: "us-west-2" });

const describeTable = async () => {
  const command = new DescribeTableCommand({ TableName: "Music" }); // Substitute your table name for "Music"
  const response = await dynamodb.send(command);

  //console.log(JSON.stringify(response, null, 2));
  const streamEnabled = JSON.stringify(response.Table.StreamSpecification.StreamEnabled, null, 2)
  console.log(streamEnabled);
};

describeTable().catch((error) => console.error(JSON.stringify(error, null, 2)));
