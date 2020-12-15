const AWS = require("aws-sdk");

AWS.config.update({ region: "us-west-2" });

const documentClient = new AWS.DynamoDB.DocumentClient();

async function getItem() {
  const params = {
    TableName: "RetailDatabase",
    Key: {
      pk: "jim.bob@somewhere.com",
      sk: "metadata",
    },
  };

  const response = await documentClient.get(params).promise();
  return response;
}

getItem()
  .then((data) =>
    console.log("GetItem succeeded:", JSON.stringify(data, null, 2))
  )
  .catch((error) => console.error(JSON.stringify(error, null, 2)));
