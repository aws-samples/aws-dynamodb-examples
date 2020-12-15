const AWS = require("aws-sdk");

AWS.config.update({ region: "us-west-2" });

const documentClient = new AWS.DynamoDB.DocumentClient();

// Define new user data to insert into the system
async function putItem() {
  const params = {
    TableName: "RetailDatabase",
    Item: {
      pk: "jim.bob@somewhere.com",
      sk: "metadata",
      name: "Jim Bob",
      first_name: "Jim",
      last_name: "Bob",
      address: {
        road: "456 Nowhere Lane",
        city: "Langely",
        state: "WA",
        pcode: "98260",
        country: "USA",
      },
      username: "jbob",
    },
  };

  const response = await documentClient.put(params).promise();
  return response;
}

putItem()
  .then(() => console.log("PutItem succeeded"))
  .catch((error) => console.error(JSON.stringify(error, null, 2)));
