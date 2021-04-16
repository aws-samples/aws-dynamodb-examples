// This is an example of a simple BatchWriteCommand with the higher level DocumentClient for Amazon DynamoDB

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, BatchWriteCommand } = require("@aws-sdk/lib-dynamodb");

async function batchWriteItems() {
  const client = new DynamoDBClient({ region: "us-west-2" });
  const ddbDocClient = DynamoDBDocumentClient.from(client);
  try {
    return await ddbDocClient.send(
        new BatchWriteCommand({
          RequestItems: {
            RetailDatabase: [
              {
                PutRequest: {
                  Item: {
                    pk: "billy.johnson@somewhere.com",
                    sk: "metadata",
                    username: "vikj",
                    first_name: "Billy",
                    last_name: "Johnson",
                    name: "Billy Johnson",
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
                    pk: "juan.schneller@somewhere.com",
                    sk: "metadata",
                    username: "joses",
                    first_name: "Juan",
                    last_name: "Schneller",
                    name: "Juan Schneller",
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
          //This line returns in the response how much capacity the batch get uses
          ReturnConsumedCapacity: "TOTAL",
        })
    );
  } catch (err) {
    console.error(err);
  }
}

batchWriteItems()
    .then((data) =>
        console.log("BatchWriteCommand succeeded:", JSON.stringify(data, null, 2)))
    .catch((error) => console.error(JSON.stringify(error, null, 2)));
