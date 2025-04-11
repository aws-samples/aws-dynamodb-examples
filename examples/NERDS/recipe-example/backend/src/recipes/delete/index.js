import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

const ENDPOINT_OVERRIDE = process.env.DYNAMODB_ENDPOINT || undefined;
const clientConfig = ENDPOINT_OVERRIDE ? { endpoint: ENDPOINT_OVERRIDE } : {};
const client = new DynamoDBClient(clientConfig);
const ddbDocClient = DynamoDBDocument.from(client);

export const handler = async (event) => {
  try {
    const { userId, recipeId } = event.pathParameters;

    if (!userId || !recipeId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "Both userId and recipeId are required",
        }),
      };
    }

    // First, get the recipe to ensure it exists and belongs to the user
    const getResult = await ddbDocClient.get({
      TableName: process.env.TABLE_NAME,
      Key: {
        PK: `RECIPE#${recipeId}`,
        SK: `RECIPE#${recipeId}`,
      },
    });

    if (!getResult.Item || getResult.Item.userId !== userId) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          message: "Recipe not found or does not belong to the user",
        }),
      };
    }

    // If the recipe exists and belongs to the user, delete both items
    await ddbDocClient.transactWrite({
      TransactItems: [
        {
          Delete: {
            TableName: process.env.TABLE_NAME,
            Key: {
              PK: `RECIPE#${recipeId}`,
              SK: `RECIPE#${recipeId}`,
            },
          },
        },
        {
          Delete: {
            TableName: process.env.TABLE_NAME,
            Key: {
              PK: `USER#${userId}`,
              SK: `RECIPE#${recipeId}`,
            },
          },
        },
      ],
    });

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
