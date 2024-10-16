import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { nanoid } from "nanoid";

const ENDPOINT_OVERRIDE = process.env.DYNAMODB_ENDPOINT || undefined;
const clientConfig = ENDPOINT_OVERRIDE ? { endpoint: ENDPOINT_OVERRIDE } : {};
const client = new DynamoDBClient(clientConfig);
const ddbDocClient = DynamoDBDocumentClient.from(client);

export const handler = async (event) => {
  try {
    const user = JSON.parse(event.body);
    const userId = nanoid();

    const item = {
      PK: `USER#${userId}`,
      SK: `PROFILE#${userId}`,
      userId,
      ...user,
      createdAt: new Date().toISOString(),
    };

    console.log(process.env.TABLE_NAME);
    await ddbDocClient.send(
      new PutCommand({
        TableName: process.env.TABLE_NAME,
        Item: item,
      })
    );

    return {
      statusCode: 201,
      body: JSON.stringify({ message: "User created successfully", userId }),
    };
  } catch (error) {
    console.error("Error creating user:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error creating user",
      }),
    };
  }
};
