import { DynamoDBDocumentClient, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

const ENDPOINT_OVERRIDE = process.env.DYNAMODB_ENDPOINT || undefined;
const clientConfig = ENDPOINT_OVERRIDE ? { endpoint: ENDPOINT_OVERRIDE } : {};
const client = new DynamoDBClient(clientConfig);
const ddbDocClient = DynamoDBDocumentClient.from(client);

export const handler = async (event) => {
  try {
    const userId = event.pathParameters.userId;

    await ddbDocClient.send(
      new DeleteCommand({
        TableName: process.env.TABLE_NAME,
        Key: {
          PK: `USER#${userId}`,
          SK: `PROFILE#${userId}`,
        },
      })
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "User deleted successfully" }),
    };
  } catch (error) {
    console.error("Error deleting user:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Error deleting user" }),
    };
  }
};
