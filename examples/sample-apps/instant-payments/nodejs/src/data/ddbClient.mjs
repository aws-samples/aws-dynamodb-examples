import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

export function createDdbClients({ endpoint, region }) {
  const lowLevel = new DynamoDBClient({
    region,
    endpoint,
    credentials: {
      accessKeyId: "local",
      secretAccessKey: "local",
    },
  });

  const doc = DynamoDBDocumentClient.from(lowLevel, {
    marshallOptions: {
      removeUndefinedValues: true,
    },
  });

  return { lowLevel, doc };
}

