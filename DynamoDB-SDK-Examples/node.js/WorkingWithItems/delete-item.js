const AWS = require("aws-sdk");

AWS.config.update({ region: "us-west-2" });

const documentClient = new AWS.DynamoDB.DocumentClient();

// Notice the conditional expression where it will only delete if the postal code is the specified value
async function deleteItem() {
  const params = {
    TableName: "RetailDatabase",
    Key: {
      pk: "jim.bob@somewhere.com",
      sk: "metadata",
    },
    ConditionExpression: "address.pcode = :val",
    ExpressionAttributeValues: {
      ":val": "98260",
    },
  };

  const response = await documentClient.delete(params).promise();
  return response;
}

deleteItem()
  .then(() => console.log("DeleteItem succeeded"))
  .catch((error) => console.error(JSON.stringify(error, null, 2)));
