// This is an example of a simple PutItem using the higher level DocumentClient for Amazon DynamoDB

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");

async function putItems() {
  const client = new DynamoDBClient({ region: "us-west-2" });
  const ddbDocClient = DynamoDBDocumentClient.from(client);

  return await ddbDocClient.send(
      new PutCommand({
        TableName: "RetailDatabase",
        Item: {
          pk: "jim.Robert@somewhere.com",
          sk: "metadata",
          name: "Jim Roberts",
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
        console.log("PutItem succeeded with HTTP code:", JSON.stringify(data.$metadata.httpStatusCode, null, 2))
    )
    .catch((error) => console.error(JSON.stringify(error, null, 2)));
