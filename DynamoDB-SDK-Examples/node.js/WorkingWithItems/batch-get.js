// This is an example of a simple BatchGetCommand with the higher level DocumentClient for Amazon DynamoDB

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, BatchGetCommand } = require("@aws-sdk/lib-dynamodb");

async function batchGetItems() {
  const client = new DynamoDBClient({ region: "us-west-2" });
  const ddbDocClient = DynamoDBDocumentClient.from(client);
  try {
    return await ddbDocClient.send(
        new BatchGetCommand({
          RequestItems: {
            RetailDatabase: {
              Keys: [
                {
                  pk: "vikram.johnson@somewhere.com",
                  sk: "metadata",
                },
                {
                  pk: "jose.schneller@somewhere.com",
                  sk: "metadata",
                },
                {
                  pk: "jose.schneller@somewhere.com2",
                  sk: "metadata"
                },
              ],
              // For this use case, the data does not changed often so why not get the
              // reads at half the cost? Your use case might be different and need true.
              ConsistentRead: false,
            },
          },
          //This line returns in the response how much capacity the batch get uses
          ReturnConsumedCapacity: "TOTAL",
        })
    );
  } catch (err) {
    console.error(err);
  }
}

batchGetItems()
    .then((data) =>
        console.log("BatchGetCommand succeeded:", JSON.stringify(data, null, 2)))
    .catch((error) => console.error(JSON.stringify(error, null, 2)));