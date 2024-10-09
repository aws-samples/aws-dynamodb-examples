import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

const ENDPOINT_OVERRIDE = process.env.DYNAMODB_ENDPOINT || undefined;
const clientConfig = ENDPOINT_OVERRIDE ? { endpoint: ENDPOINT_OVERRIDE } : {};
const client = new DynamoDBClient(clientConfig);
const ddbDocClient = DynamoDBDocumentClient.from(client);

export const handler = async (event) => {
  try {
    const { userId } = event.pathParameters || {};

    if (!userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "userId is required" }),
      };
    }

    let queryParams = {
      TableName: process.env.TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: {
        ":pk": `USER#${userId}`,
        ":sk": "RECIPE#",
      },
    };

    const { Items } = await ddbDocClient.send(new QueryCommand(queryParams));

    // Transform the items to remove the PK and SK
    const recipes = Items.map((item) => {
      const { PK, SK, ...recipeData } = item;
      return { ...recipeData };
    });

    return {
      statusCode: 200,
      body: JSON.stringify(recipes),
    };
  } catch (error) {
    console.error("Error listing recipes:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Error listing recipes" }),
    };
  }
};
