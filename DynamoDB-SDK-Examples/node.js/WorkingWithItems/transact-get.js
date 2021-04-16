// This is an example of a simple TransactGetCommand with the higher level DocumentClient for Amazon DynamoDB

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, TransactGetCommand } = require("@aws-sdk/lib-dynamodb");

async function batchGetItems() {
  const client = new DynamoDBClient({ region: "us-west-2" });
  const ddbDocClient = DynamoDBDocumentClient.from(client);
  try {
    return await ddbDocClient.send(
        new TransactGetCommand({
          TransactItems: [
            {
              Get: {
                TableName: "RetailDatabase",
                Key: {
                  pk: "vikram.johnson@somewhere.com",
                  sk: "metadata",
                },
              },
            },
            {
              Get: {
                TableName: "RetailDatabase",
                Key: {
                  pk: "jose.schneller@somewhere.com",
                  sk: "metadata",
                },
              },
            },
          ],
          //This returns an object with info on how much capacity the operation used and is optional.
          ReturnConsumedCapacity: "TOTAL",
        })
    );
  } catch (err) {
    console.error(err);
  }
}

batchGetItems()
    .then((data) =>
        console.log("TransactGetCommand succeeded:", JSON.stringify(data, null, 2)))
    .catch((error) => console.error(JSON.stringify(error, null, 2)));