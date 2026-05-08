import { CreateTableCommand, DynamoDBClient, ResourceInUseException } from "@aws-sdk/client-dynamodb";

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

// DynamoDB does not support true multi-attribute keys; we model the spec's composites as derived attributes.
const ATTR_MERCHANT_PAYMENTS_SK = "merchantPaymentsSk"; // createdAtUtc + '#' + paymentId
const ATTR_MERCHANT_STATE_PK = "merchantStatePk"; // merchantId + '#' + aggregateState

const cmd = new CreateTableCommand({
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
  StreamSpecification: {
    StreamEnabled: true,
    StreamViewType: "NEW_IMAGE",
  },
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
});

try {
  await ddb.send(cmd);
  // Waiters are nice, but keeping scripts dependency-light; the app will retry/handle readiness.
  console.log(`Created table ${tableName}`);
} catch (err) {
  if (err instanceof ResourceInUseException || err?.name === "ResourceInUseException") {
    console.log(`Table ${tableName} already exists; skipping create`);
    process.exit(0);
  }
  throw err;
}

