import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { nanoid } from "nanoid";

const ENDPOINT_OVERRIDE = process.env.DYNAMODB_ENDPOINT || undefined;
const clientConfig = ENDPOINT_OVERRIDE ? { endpoint: ENDPOINT_OVERRIDE } : {};
const client = new DynamoDBClient(clientConfig);
const ddbDocClient = DynamoDBDocument.from(client);

export const handler = async (event) => {
  try {
    const { userId } = event.pathParameters || {};
    if (!userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "userId is required" }),
      };
    }

    const recipe = JSON.parse(event.body);
    const recipeId = nanoid();
    const timestamp = new Date().toISOString();

    const recipeItem = {
      PK: `RECIPE#${recipeId}`,
      SK: `RECIPE#${recipeId}`,
      recipeId,
      userId,
      createdAt: timestamp,
      updatedAt: timestamp,
      ...recipe,
    };

    const userRecipeItem = {
      PK: `USER#${userId}`,
      SK: `RECIPE#${recipeId}`,
      recipeId,
      userId,
      recipeName: recipe.name, // Assuming the recipe has a 'name' field
      createdAt: timestamp,
    };

    await ddbDocClient.transactWrite({
      TransactItems: [
        {
          Put: {
            TableName: process.env.TABLE_NAME,
            Item: recipeItem,
          },
        },
        {
          Put: {
            TableName: process.env.TABLE_NAME,
            Item: userRecipeItem,
          },
        },
      ],
    });

    return {
      statusCode: 201,
      body: JSON.stringify({
        message: "Recipe created successfully",
        recipeId,
      }),
    };
  } catch (error) {
    console.error("Error creating recipe:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Error creating recipe" }),
    };
  }
};
