import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "us-west-2" });
const docClient = DynamoDBDocumentClient.from(client);

const query = async () => {
  const params = {
    TableName: "Thread",
    KeyConditionExpression: "#fn = :name AND #sub = :sub",
    ExpressionAttributeNames: {
      "#fn": "ForumName",
      "#sub": "Subject",
    },
    ExpressionAttributeValues: {
      ":name": "Amazon DynamoDB",
      ":sub": "DynamoDB Thread 1",
    },
  };

  try {
    // Send the query command
    const response = await docClient.send(new QueryCommand(params));

    // We don't need to check for more items since when we specify an explicit partition key and
    // sort key on the primary table, we are guaranteed to get zero or one item back.

    return response;
  } catch (error) {
    console.error("Error querying DynamoDB:", error);
    throw error;
  }
};

query()
  .then((response) => console.log(`Query response: ${JSON.stringify(response, null, 2)}`))
  .catch((error) => console.error(JSON.stringify(error, null, 2)));
