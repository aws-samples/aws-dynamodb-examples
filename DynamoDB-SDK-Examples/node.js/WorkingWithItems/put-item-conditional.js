/* This is an example of a simple PutItem with a ConditionExpression using
the higher level DocumentClient for Amazon DynamoDB. The conditional
expression must be true for this Put call to succeed. */

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");

async function putItems() {
  const client = new DynamoDBClient({ region: "us-west-2" });
  const ddbDocClient = DynamoDBDocumentClient.from(client);
  return await ddbDocClient.send(
      new PutCommand({
        TableName: "RetailDatabase",
        Item: {
          pk: "jim.Robert@somewhere.com", // Partition key
          sk: "metadata",                 // Sort key
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
        // Start conditional expression to make sure the value of the sk attribute begins with the string "meta".
        // If not, then the put will fail with a "ConditionalCheckFailedException"
        ConditionExpression: "begins_with(sk, :val)",
        ExpressionAttributeValues: {":val" : "meta"}
      })
  );
}

putItems()
    .then((data) =>
        console.log("PutItem succeeded:", JSON.stringify(data, null, 2)))
    .catch((error) => console.error(JSON.stringify(error, null, 2)));