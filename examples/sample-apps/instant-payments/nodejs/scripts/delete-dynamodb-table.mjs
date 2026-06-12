import {
  DeleteTableCommand,
  DynamoDBClient,
  ResourceNotFoundException,
  waitUntilTableNotExists,
} from "@aws-sdk/client-dynamodb";
import "dotenv/config";

function required(name) {
  const v = process.env[name];
  if (!v || !String(v).trim()) throw new Error(`Missing env ${name}`);
  return String(v).trim();
}

const endpoint =
  process.env.DYNAMODB_ENDPOINT?.trim() ||
  process.env.AWS_ENDPOINT_URL?.trim() ||
  `http://localhost:${process.env.DYNAMODB_LOCAL_HOST_PORT ?? "18000"}`;
const region = process.env.DYNAMODB_REGION?.trim() || process.env.AWS_REGION?.trim() || "eu-west-1";
const tableName =
  process.env.DYNAMODB_TABLENAME?.trim() ||
  process.env.DYNAMODB_TABLE_NAME?.trim() ||
  "JS_InstantPayments";

const ddb = new DynamoDBClient({
  region,
  endpoint,
  credentials: { accessKeyId: "local", secretAccessKey: "local" },
});

try {
  await ddb.send(new DeleteTableCommand({ TableName: tableName }));
  await waitUntilTableNotExists({ client: ddb, maxWaitTime: 60 }, { TableName: tableName });
  console.log(`Deleted table ${tableName}`);
} catch (err) {
  if (err instanceof ResourceNotFoundException || err?.name === "ResourceNotFoundException") {
    console.log(`Table ${tableName} does not exist; nothing to delete`);
    process.exit(0);
  }
  throw err;
}
