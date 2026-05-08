import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

function required(name) {
  const v = process.env[name];
  if (!v || !String(v).trim()) throw new Error(`Missing env ${name}`);
  return String(v).trim();
}

const endpoint = required("AWS_ENDPOINT_URL");
const region = required("AWS_REGION");
const tableName = process.env.DYNAMODB_TABLE_NAME ?? required("DYNAMODB_TABLE_NAME");

const ddb = new DynamoDBClient({
  region,
  endpoint,
  credentials: { accessKeyId: "local", secretAccessKey: "local" },
});
const doc = DynamoDBDocumentClient.from(ddb);

const seedAccounts = [
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
].map(([accountId, currentBalance, availableBalance, currency]) => {
  const pk = `ACCOUNT#${accountId}`;
  return {
    PK: pk,
    SK: pk,
    entityType: "ACCOUNT",
    accountId,
    status: "ACTIVE",
    currentBalance,
    availableBalance,
    currency,
    version: 1,
  };
});

let inserted = 0;
for (const item of seedAccounts) {
  try {
    await doc.send(
      new PutCommand({
        TableName: tableName,
        Item: item,
        ConditionExpression: "attribute_not_exists(PK)",
      }),
    );
    inserted += 1;
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") continue;
    throw err;
  }
}

console.log(`Seeded accounts: inserted=${inserted}, total=${seedAccounts.length}`);

