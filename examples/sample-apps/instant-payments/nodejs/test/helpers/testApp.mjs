import { DynamoDBClient, DeleteTableCommand, ResourceNotFoundException, waitUntilTableNotExists } from "@aws-sdk/client-dynamodb";
import { buildApp } from "../../src/app.mjs";

export async function createTestApp() {
  const endpoint = process.env.DYNAMODB_ENDPOINT ?? "http://localhost:8000";
  const region = process.env.DYNAMODB_REGION ?? "eu-west-1";
  const tableName = `JS_InstantPayments_test_${Date.now()}_${Math.random().toString(16).slice(2)}`;

  // Ensure app uses isolated table
  process.env.NODE_ENV = "test";
  process.env.PORT = "0";
  process.env.DYNAMODB_ENDPOINT = endpoint;
  process.env.DYNAMODB_REGION = region;
  process.env.DYNAMODB_CLIENTTYPE = "high-level";
  process.env.DYNAMODB_TABLENAME = tableName;
  process.env.DYNAMODB_IDEMPOTENCY_TTL_SECONDS = "3600";
  process.env.DYNAMODB_STREAMS_ITERATOR_TYPE = "TRIM_HORIZON";

  const app = await buildApp();

  return {
    app,
    endpoint,
    region,
    tableName,
    async close() {
      await app.close();
      await deleteTableBestEffort({ endpoint, region, tableName });
    },
  };
}

async function deleteTableBestEffort({ endpoint, region, tableName }) {
  const ddb = new DynamoDBClient({
    endpoint,
    region,
    credentials: { accessKeyId: "local", secretAccessKey: "local" },
  });

  try {
    await ddb.send(new DeleteTableCommand({ TableName: tableName }));
  } catch (err) {
    if (err instanceof ResourceNotFoundException || err?.name === "ResourceNotFoundException") return;
    // DynamoDB Local may throw odd shapes; ignore in tests.
    return;
  }

  try {
    await waitUntilTableNotExists(
      { client: ddb, maxWaitTime: 10 },
      { TableName: tableName },
    );
  } catch {
    // ignore
  }
}

