import { DynamoDBDocumentClient, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

const ENDPOINT_OVERRIDE = process.env.DYNAMODB_ENDPOINT || undefined;
const clientConfig = ENDPOINT_OVERRIDE ? { endpoint: ENDPOINT_OVERRIDE } : {};
const client = new DynamoDBClient(clientConfig);
const ddbDocClient = DynamoDBDocumentClient.from(client);

export const handler = async (event) => {
  try {
    const recipeId = event.pathParameters.recipeId;

    await ddbDocClient.send(
      new DeleteCommand({
        TableName: process.env.TABLE_NAME,
        Key: {
          PK: `RECIPE#${recipeId}`,
          SK: `RECIPE#${recipeId}`,
        },
      })
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Recipe deleted successfully" }),
    };
  } catch (error) {
    console.error("Error deleting recipe:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Error deleting recipe" }),
    };
  }
};
