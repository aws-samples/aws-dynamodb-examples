import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { nanoid } from "nanoid";

const ENDPOINT_OVERRIDE = process.env.DYNAMODB_ENDPOINT || undefined;
const clientConfig = ENDPOINT_OVERRIDE ? { endpoint: ENDPOINT_OVERRIDE } : {};
const client = new DynamoDBClient(clientConfig);
const ddbDocClient = DynamoDBDocumentClient.from(client);

export const handler = async (event) => {
  try {
    const recipe = JSON.parse(event.body);
    const recipeId = nanoid();

    const item = {
      PK: `RECIPE#${recipeId}`,
      SK: `RECIPE#${recipeId}`,
      recipeId,
      ...recipe,
      createdAt: new Date().toISOString(),
    };

    await ddbDocClient.send(
      new PutCommand({
        TableName: process.env.TABLE_NAME,
        Item: item,
      })
    );

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
