/*const AWS = require("aws-sdk");

AWS.config.update({ region: "us-west-2" });

const documentClient = new AWS.DynamoDB.DocumentClient();

// Define the name of a user account to update. Note that in this example, we have to alias "name" using ExpressionAttributeNames as name is a reserved word in DynamoDB.
// Notice also the conditional expression where it will only update if the age is greater than or equal to 21
async function updateItem() {
  const params = {
    TableName: "RetailDatabase",
    Key: {
      pk: "jim.bob@somewhere.com",
      sk: "metadata",
    },
    ExpressionAttributeNames: {
      "#n": "name",
    },
    UpdateExpression: "set #n = :nm",
    ConditionExpression: "age >= :a",
    ExpressionAttributeValues: {
      ":nm": "Big Jim Bob",
      ":a": 21,
    },
    ReturnValues: "ALL_NEW",
  };

  const response = await documentClient.update(params).promise();
  return response;
}

updateItem()
  .then((data) =>
    console.log("UpdateItem succeeded:", JSON.stringify(data, null, 2))
  )
  .catch((error) => console.error(JSON.stringify(error, null, 2))); */





/* This is an example of an UpdateCommand with a Conditional Expression using
the higher level DocumentClient for Amazon DynamoDB. It updates one attribute
on the item, but it could easily do more if needed. */

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
        // The ConditionExpression must evaluate to be true of the Update fails. If the age attribute
        // on the item is less than 21 or the attribute is missing, the item is not updated.
        ConditionExpression: "age >= :a",
        ExpressionAttributeValues: {
          ":nm": "Big Jim Bob2",
          ":a": 21,
        },
        ReturnValues: "ALL_NEW",
      })
  );
}

updateItem()
    .then((data) =>
        console.log("UpdateCommand succeeded:", JSON.stringify(data, null, 2)))
    .catch((error) => console.error(JSON.stringify(error, null, 2)));
