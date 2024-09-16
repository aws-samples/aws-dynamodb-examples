/* This is an example of a DeleteCommand with a ConditionExpression using
the higher level DocumentClient for Amazon DynamoDB. The conditional
expression must be true for this DeleteCommand to succeed. */

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, DeleteCommand } = require("@aws-sdk/lib-dynamodb");

async function deleteItem() {
  const client = new DynamoDBClient({ region: "us-west-2" });
  const ddbDocClient = DynamoDBDocumentClient.from(client);
  return await ddbDocClient.send(
      new DeleteCommand({
        TableName: "RetailDatabase",
        Key: {
          pk: "jim.bob@somewhere.com",    // Partition key
          sk: "metadata",                 // Sort key
        },
        // Below is an optional conditional expression to validate the value of the address.pcode
        // value is the value provided. If the item matching the partition and sort key are found
        // but the values below does not match, then the delete will fail and the item not deleted.
        ConditionExpression: "address.pcode = :val",
        ExpressionAttributeValues: {
          ":val" : "98261",
        },
      })
  );
}

deleteItem()
    .then((data) =>
        console.log("DeleteCommand succeeded:", JSON.stringify(data, null, 2)))
    .catch((error) => console.error(JSON.stringify(error, null, 2)));