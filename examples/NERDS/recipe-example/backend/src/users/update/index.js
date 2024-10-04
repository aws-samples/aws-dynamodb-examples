import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

const ENDPOINT_OVERRIDE = process.env.DYNAMODB_ENDPOINT || undefined;
const clientConfig = ENDPOINT_OVERRIDE ? { endpoint: ENDPOINT_OVERRIDE } : {};
const client = new DynamoDBClient(clientConfig);
const ddbDocClient = DynamoDBDocumentClient.from(client);

export const handler = async (event) => {
  try {
    const userId = event.pathParameters.userId;
    const updates = JSON.parse(event.body);

    const updateExpression = Object.keys(updates)
      .map((key) => `#${key} = :${key}`)
      .join(", ");
    const expressionAttributeNames = Object.keys(updates).reduce(
      (acc, key) => ({ ...acc, [`#${key}`]: key }),
      {}
    );
    const expressionAttributeValues = Object.entries(updates).reduce(
      (acc, [key, value]) => ({ ...acc, [`:${key}`]: value }),
      {}
    );

    const { Attributes } = await ddbDocClient.send(
      new UpdateCommand({
        TableName: process.env.TABLE_NAME,
        Key: {
          PK: `USER#${userId}`,
          SK: `PROFILE#${userId}`,
        },
        UpdateExpression: `SET ${updateExpression}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: "ALL_NEW",
      })
    );

    return {
      statusCode: 200,
      body: JSON.stringify(Attributes),
    };
  } catch (error) {
    console.error("Error updating user:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Error updating user" }),
    };
  }
};
