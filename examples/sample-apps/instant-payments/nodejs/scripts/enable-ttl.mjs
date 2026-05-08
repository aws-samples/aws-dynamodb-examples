import {
  DescribeTimeToLiveCommand,
  DynamoDBClient,
  UpdateTimeToLiveCommand,
} from "@aws-sdk/client-dynamodb";

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

const current = await ddb.send(new DescribeTimeToLiveCommand({ TableName: tableName }));
const status = current?.TimeToLiveDescription?.TimeToLiveStatus;
if (status === "ENABLED" || status === "ENABLING") {
  console.log(`TTL already ${status} on ${tableName}`);
  process.exit(0);
}

await ddb.send(
  new UpdateTimeToLiveCommand({
    TableName: tableName,
    TimeToLiveSpecification: {
      Enabled: true,
      AttributeName: "ttl",
    },
  }),
);

console.log(`Enabled TTL (ttl) on ${tableName}`);

