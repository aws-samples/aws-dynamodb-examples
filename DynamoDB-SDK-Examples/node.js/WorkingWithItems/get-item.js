// This is an example of a simple GetItem with the higher level DocumentClient for Amazon DynamoDB

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
            pk: "joe@somewhere.com",
            sk: "metadata"
          },
        })
    );
  } catch (err) {
    console.error(err);
  }
}

getItems()
    .then((data) =>
        console.log("GetItem succeeded:", JSON.stringify(data.Item, null, 2))
    )
    .catch((error) => console.error(JSON.stringify(error, null, 2)));