/*const AWS = require("aws-sdk");

AWS.config.update({ region: "us-west-2" });

const documentClient = new AWS.DynamoDB.DocumentClient();

// Define new user data to insert into the system. Notice the conditional expression where it will prevent overwriting if the item already exists
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
    ConditionExpression: "attribute_not_exists(sk)",
  };

  return await documentClient.put(params).promise();
}

putItem()
  .then(() => console.log("PutItem succeeded"))
  .catch((error) => console.error(JSON.stringify(error, null, 2)));
*/

// This is an example of a simple GetItem with the higher level DocumentClient for Amazon DynamoDB

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");

async function putItems() {
  const client = new DynamoDBClient({ region: "us-west-2" });
  const ddbDocClient = DynamoDBDocumentClient.from(client);
  try {
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
          ConditionExpression: "attribute_not_exists(sk)",
        })
    );
  } catch (err) {
    console.error(err);
  }
}

putItems()
    .then((data) =>
        console.log("PutItem succeeded:", JSON.stringify(data, null, 2))
    )
    .catch((error) => console.error(JSON.stringify(error, null, 2)));