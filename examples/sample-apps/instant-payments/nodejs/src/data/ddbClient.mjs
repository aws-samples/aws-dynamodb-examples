import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBStreamsClient } from "@aws-sdk/client-dynamodb-streams";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { NodeHttpHandler } from "@smithy/node-http-handler";

const LOCAL_CREDENTIALS = {
  accessKeyId: "local",
  secretAccessKey: "local",
};

/**
 * Shared DynamoDB client knobs (mirrors Java {@code DynamoDbConfig}).
 */
export function buildAwsClientConfig({ endpoint, region }) {
  return {
    region,
    endpoint,
    maxAttempts: 9,
    credentials: LOCAL_CREDENTIALS,
    requestHandler: new NodeHttpHandler({
      connectionTimeout: 1_500,
      requestTimeout: 5_000,
      maxSockets: 200,
    }),
  };
}

export function createDdbClients({ endpoint, region }) {
  const lowLevel = new DynamoDBClient(buildAwsClientConfig({ endpoint, region }));

  const doc = DynamoDBDocumentClient.from(lowLevel, {
    marshallOptions: {
      removeUndefinedValues: true,
    },
  });

  return { lowLevel, doc };
}

export function createStreamsClient({ endpoint, region }) {
  return new DynamoDBStreamsClient(buildAwsClientConfig({ endpoint, region }));
}
