import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

const ENDPOINT_OVERRIDE = process.env.DYNAMODB_ENDPOINT || undefined;
const clientConfig = ENDPOINT_OVERRIDE ? { endpoint: ENDPOINT_OVERRIDE } : {};
const client = new DynamoDBClient(clientConfig);
const ddbDocClient = DynamoDBDocumentClient.from(client);

export const handler = async (event) => {
  try {
    const userId = event.pathParameters.userId;

    const { Item } = await ddbDocClient.send(
      new GetCommand({
        TableName: process.env.TABLE_NAME,
        Key: {
          PK: `USER#${userId}`,
          SK: `PROFILE#${userId}`,
        },
      })
    );

    if (!Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "User not found" }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(Item),
    };
  } catch (error) {
    console.error("Error getting user:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Error getting user" }),
    };
  }
};
