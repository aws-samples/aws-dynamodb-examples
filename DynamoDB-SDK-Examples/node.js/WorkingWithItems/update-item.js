const AWS = require("aws-sdk");

AWS.config.update({ region: "us-west-2" });

const documentClient = new AWS.DynamoDB.DocumentClient();

// Define the name of a user account to update. Note that in this example, we have to alias "name" using ExpressionAttributeNames as name is a reserved word in DynamoDB.
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
    ExpressionAttributeValues: {
      ":nm": "Big Jim Bob",
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
  .catch((error) => console.error(JSON.stringify(error, null, 2)));
