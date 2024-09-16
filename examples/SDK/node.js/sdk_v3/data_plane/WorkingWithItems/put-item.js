// This is an example of a simple PutCommand using the higher level DocumentClient for Amazon DynamoDB

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");

async function putItems() {
  const client = new DynamoDBClient({ region: "us-west-2" });
  const ddbDocClient = DynamoDBDocumentClient.from(client);

  return await ddbDocClient.send(
      new PutCommand({
        TableName: "RetailDatabase",
        Item: {
          pk: "jim.bob@somewhere.com", // Partition Key
          sk: "metadata",                 // Sort Key
          name: "Jim Bob",
          first_name: "Jim",
          last_name: "Roberts",
          address: {
            road: "456 Nowhere Lane",
            city: "Langely",
            state: "WA",
            pcode: "98260",
            country: "USA",
          },
          username: "jrob",
        },
      })
  );
}

putItems()
    .then((data) =>
        console.log("PutCommand succeeded with HTTP code:", JSON.stringify(data.$metadata.httpStatusCode, null, 2)))
    .catch((error) => console.error(JSON.stringify(error, null, 2)));
