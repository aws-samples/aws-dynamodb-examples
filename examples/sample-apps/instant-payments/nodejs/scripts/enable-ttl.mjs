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

const endpoint = required("DYNAMODB_ENDPOINT");
const region = required("DYNAMODB_REGION");
const tableName = required("DYNAMODB_TABLENAME");

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

