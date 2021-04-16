// This is an example of a simple GetCommand with the higher level DocumentClient for Amazon DynamoDB

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand } = require("@aws-sdk/lib-dynamodb");

async function getItems() {
  const client = new DynamoDBClient({ region: "us-west-2" });
  const ddbDocClient = DynamoDBDocumentClient.from(client);
  try {
    return await ddbDocClient.send(
        new GetCommand({
          TableName: "RetailDatabase",
          Key: {
            pk: "jim.bob@somewhere.com", // Partition Key
            sk: "metadata"          // Sort Key
          },
        })
    );
  } catch (err) {
    console.error(err);
  }
}

getItems()
    .then((data) =>
        console.log("GetCommand succeeded:", JSON.stringify(data.Item, null, 2)))
    .catch((error) => console.error(JSON.stringify(error, null, 2)));