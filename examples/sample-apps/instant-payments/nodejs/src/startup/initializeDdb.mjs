import {
  CreateTableCommand,
  DescribeTimeToLiveCommand,
  ListTablesCommand,
  ResourceInUseException,
  UpdateTimeToLiveCommand,
} from "@aws-sdk/client-dynamodb";
import { inspect } from "node:util";
import { sendPutCommand } from "../infrastructure/persistence/ddbDocumentBridge.mjs";

const ATTR_MERCHANT_PAYMENTS_SK = "merchantPaymentsSk";
const ATTR_MERCHANT_STATE_PK = "merchantStatePk";

export async function initializeDdb({ ddb, ddbRuntime, tableName, log }) {
  await waitUntilDdbReachable({ ddb, log });
  await createTableIfMissing({ ddb, tableName, log });
  await enableTtlBestEffort({ ddb, tableName, log });
  await seedAccounts({ ddbRuntime, tableName, log });
}

function summarizeErr(err) {
  if (!err) return "(no error object)";
  const msg = err.message?.trim();
  const bits = [err.name, err.code, msg || undefined, err.$metadata?.httpStatusCode].filter(Boolean);
  if (bits.length) return bits.join(" | ");
  return inspect(err, { depth: 2, breakLength: 120 });
}

async function waitUntilDdbReachable({ ddb, log, maxAttempts = 45, delayMs = 1000 }) {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await ddb.send(new ListTablesCommand({ Limit: 1 }));
      return;
    } catch (err) {
      if (attempt === maxAttempts) throw err;
      log.warn(
        { attempt, maxAttempts, err: summarizeErr(err) },
        "DynamoDB endpoint not ready yet; retrying (start DynamoDB Local: ./scripts/start-dynamodb-local.sh or docker compose up -d dynamodb-local)",
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

async function createTableIfMissing({ ddb, tableName, log }) {
  try {
    await ddb.send(
      new CreateTableCommand({
        TableName: tableName,
        BillingMode: "PAY_PER_REQUEST",
        KeySchema: [
          { AttributeName: "PK", KeyType: "HASH" },
          { AttributeName: "SK", KeyType: "RANGE" },
        ],
        AttributeDefinitions: [
          { AttributeName: "PK", AttributeType: "S" },
          { AttributeName: "SK", AttributeType: "S" },
          { AttributeName: "merchantId", AttributeType: "S" },
          { AttributeName: "createdAtUtc", AttributeType: "S" },
          { AttributeName: ATTR_MERCHANT_PAYMENTS_SK, AttributeType: "S" },
          { AttributeName: ATTR_MERCHANT_STATE_PK, AttributeType: "S" },
        ],
        StreamSpecification: { StreamEnabled: true, StreamViewType: "NEW_IMAGE" },
        GlobalSecondaryIndexes: [
          {
            IndexName: "GSI_MERCHANT_PAYMENTS",
            KeySchema: [
              { AttributeName: "merchantId", KeyType: "HASH" },
              { AttributeName: ATTR_MERCHANT_PAYMENTS_SK, KeyType: "RANGE" },
            ],
            Projection: { ProjectionType: "ALL" },
          },
          {
            IndexName: "GSI_MERCHANT_STATE_PAYMENTS",
            KeySchema: [
              { AttributeName: ATTR_MERCHANT_STATE_PK, KeyType: "HASH" },
              { AttributeName: "createdAtUtc", KeyType: "RANGE" },
            ],
            Projection: {
              ProjectionType: "INCLUDE",
              NonKeyAttributes: [
                "paymentId",
                "lastSequence",
                "correlationId",
                "amount",
                "currency",
                "updatedAtUtc",
                "reasonCode",
              ],
            },
          },
        ],
      }),
    );
    log.info({ tableName }, "Created DynamoDB table");
  } catch (err) {
    if (err instanceof ResourceInUseException || err?.name === "ResourceInUseException") {
      log.info({ tableName }, "DynamoDB table exists; skipping create");
      return;
    }
    throw err;
  }
}

async function enableTtlBestEffort({ ddb, tableName, log }) {
  try {
    const current = await ddb.send(new DescribeTimeToLiveCommand({ TableName: tableName }));
    const status = current?.TimeToLiveDescription?.TimeToLiveStatus;
    if (status === "ENABLED" || status === "ENABLING") {
      log.info({ tableName, status }, "TTL already enabled/enabling");
      return;
    }
  } catch {
    // ignore (DDB Local can be finicky)
  }

  try {
    await ddb.send(
      new UpdateTimeToLiveCommand({
        TableName: tableName,
        TimeToLiveSpecification: { Enabled: true, AttributeName: "ttl" },
      }),
    );
    log.info({ tableName }, "Enabled TTL on attribute ttl");
  } catch (err) {
    log.warn({ tableName, err: err?.message ?? String(err) }, "Could not enable TTL (benign)");
  }
}

async function seedAccounts({ ddbRuntime, tableName, log }) {
  const rows = [
    ["acc_usd_1", 10000, 10000, "USD"],
    ["acc_usd_2", 5000, 5000, "USD"],
    ["acc_usd_3", 500, 500, "USD"],
    ["acc_usd_4", 100, 100, "USD"],
    ["acc_usd_5", 0, 0, "USD"],
    ["acc_eur_1", 10000, 10000, "EUR"],
    ["acc_eur_2", 5000, 5000, "EUR"],
    ["acc_eur_3", 500, 500, "EUR"],
    ["acc_eur_4", 100, 100, "EUR"],
    ["acc_eur_5", 0, 0, "EUR"],
  ];

  let inserted = 0;
  for (const [accountId, currentBalance, availableBalance, currency] of rows) {
    const key = `ACCOUNT#${accountId}`;
    try {
      await sendPutCommand(ddbRuntime, {
        TableName: tableName,
        Item: {
          PK: key,
          SK: key,
          entityType: "ACCOUNT",
          accountId,
          status: "ACTIVE",
          currentBalance,
          availableBalance,
          currency,
          version: 1,
        },
        ConditionExpression: "attribute_not_exists(PK)",
      });
      inserted += 1;
    } catch (err) {
      if (err?.name === "ConditionalCheckFailedException") continue;
      throw err;
    }
  }

  log.info({ inserted, total: rows.length }, "Seeded demo accounts");
}

