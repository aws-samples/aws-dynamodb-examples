const AWS = require("aws-sdk");

AWS.config.update({ region: "us-west-2" });

const documentClient = new AWS.DynamoDB.DocumentClient();

// Batch write 2 items into the table
async function batchWriteItem() {
  const params = {
    RequestItems: {
      RetailDatabase: [
        {
          PutRequest: {
            Item: {
              pk: "vikram.johnson@somewhere.com",
              sk: "metadata",
              username: "vikj",
              first_name: "Vikram",
              last_name: "Johnson",
              name: "Vikram Johnson",
              age: 31,
              address: {
                road: "89105 Bakken Rd",
                city: "Greenbank",
                pcode: 98253,
                state: "WA",
                country: "USA",
              },
            },
          },
        },
        {
          PutRequest: {
            Item: {
              pk: "jose.schneller@somewhere.com",
              sk: "metadata",
              username: "joses",
              first_name: "Jose",
              last_name: "Schneller",
              name: "Jose Schneller",
              age: 27,
              address: {
                road: "12341 Fish Rd",
                city: "Freeland",
                pcode: 98249,
                state: "WA",
                country: "USA",
              },
            },
          },
        },
      ],
    },
  };

  const response = await documentClient.batchWrite(params).promise();
  return response;
}

batchWriteItem()
  .then(() => console.log("BatchWriteItem succeeded"))
  .catch((error) => console.error(JSON.stringify(error, null, 2)));
