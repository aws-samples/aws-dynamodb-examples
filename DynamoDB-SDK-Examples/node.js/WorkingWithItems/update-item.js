/* This is an example of an UpdateCommand using the higher level DocumentClient
for Amazon DynamoDB. It updates one attribute on the item, but it could easily
do more if needed. */

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, UpdateCommand } = require("@aws-sdk/lib-dynamodb");

async function updateItem() {
  const client = new DynamoDBClient({ region: "us-west-2" });
  const ddbDocClient = DynamoDBDocumentClient.from(client);

  return await ddbDocClient.send(
      new UpdateCommand({
        TableName: "RetailDatabase",
        Key: {
          pk: "jim.bob@somewhere.com",    // Partition key
          sk: "metadata",                 // Sort key
        },
        ExpressionAttributeNames: {
          "#n": "name",
        },
        UpdateExpression: "set #n = :nm",
        ExpressionAttributeValues: {
          ":nm": "Big Jim Bob",
        },
        ReturnValues: "ALL_NEW",
      })
  );
}

updateItem()
    .then((data) =>
        console.log("UpdateCommand succeeded:", JSON.stringify(data, null, 2)))
    .catch((error) => console.error(JSON.stringify(error, null, 2)));