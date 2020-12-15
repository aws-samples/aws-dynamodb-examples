const AWS = require("aws-sdk");

AWS.config.update({ region: "us-west-2" });

const documentClient = new AWS.DynamoDB.DocumentClient();

// Define the partition keys for the two items we want to get.
async function transactGetItem() {
  const params = {
    TransactItems: [
      {
        Get: {
          TableName: "Products",
          Key: {
            ProductId: "B07J1337PJ42",
          },
        },
      },
      {
        Get: {
          TableName: "Orders",
          Key: {
            OrderId: "171-3549115-4111337",
          },
        },
      },
    ],
    ReturnConsumedCapacity: "TOTAL",
  };

  const response = await documentClient.transactGet(params).promise();
  return response;
}

transactGetItem()
  .then((data) =>
    console.log("TransactGetItem succeeded:", JSON.stringify(data, null, 2))
  )
  .catch((error) => console.error(JSON.stringify(error, null, 2)));
