import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

const ENDPOINT_OVERRIDE = process.env.DYNAMODB_ENDPOINT || undefined;
const clientConfig = ENDPOINT_OVERRIDE ? { endpoint: ENDPOINT_OVERRIDE } : {};
const client = new DynamoDBClient(clientConfig);
const ddbDocClient = DynamoDBDocumentClient.from(client);

export const handler = async (event) => {
  try {
    const { userId, sort, search, ingredient, tag, prepTime } =
      event.queryStringParameters || {};

    let queryParams = {
      TableName: process.env.TABLE_NAME,
      KeyConditionExpression: "begins_with(PK, :pk)",
      ExpressionAttributeValues: {
        ":pk": "RECIPE#",
      },
    };

    if (userId) {
      queryParams.FilterExpression = "userId = :userId";
      queryParams.ExpressionAttributeValues[":userId"] = userId;
    }

    // Add more conditions based on other query parameters (sort, search, ingredient, tag, prepTime)
    // This would require additional GSIs or complex filtering logic

    const { Items } = await ddbDocClient.send(new QueryCommand(queryParams));

    return {
      statusCode: 200,
      body: JSON.stringify(Items),
    };
  } catch (error) {
    console.error("Error listing recipes:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Error listing recipes" }),
    };
  }
};
