// This is an example of a simple TransactWriteCommand with the higher level DocumentClient for Amazon DynamoDB

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, TransactWriteCommand } = require("@aws-sdk/lib-dynamodb");

async function transactWriteItems() {
  const client = new DynamoDBClient({ region: "us-west-2" });
  const ddbDocClient = DynamoDBDocumentClient.from(client);
  try {
    return await ddbDocClient.send(
        new TransactWriteCommand({
          TransactItems: [
            // Update the product status if the condition is met
            {
              Update: {
                TableName: "Products",
                Key: {
                  ProductId: "B07J1337PJ42",
                },
                UpdateExpression: "SET ProductStatus = :new_status",
                ConditionExpression: "ProductStatus = :expected_status",
                ExpressionAttributeValues: {
                  ":new_status": "SOLD",
                  ":expected_status": "IN_STOCK",
                },
                ReturnValuesOnConditionCheckFailure: "ALL_OLD",
              },
            },
            // Create the order if it doesn't already exist
            {
              Put: {
                TableName: "Orders",
                Item: {
                  OrderId: "171-3549115-4111337",
                  ProductId: "productKey",
                  OrderStatus: "CONFIRMED",
                  OrderTotal: "100",
                },
                ConditionExpression: "attribute_not_exists(OrderId)",
                ReturnValuesOnConditionCheckFailure: "ALL_OLD",
              },
            },
          ],
          ReturnConsumedCapacity: "TOTAL",
        })
    );
  } catch (err) {
    console.error(err);
  }
}

transactWriteItems()
    .then((data) =>
        console.log("TransactWriteCommand succeeded:", JSON.stringify(data, null, 2)))
    .catch((error) => console.error(JSON.stringify(error, null, 2)));
