// This is simple example to export dynamodb table to S3 bucket.

const {
  DynamoDBClient,
  ExportTableToPointInTimeCommand,
} = require("@aws-sdk/client-dynamodb");

const s3_bucket_name = "aws-dynamodb-pitr-demo";
const table_arn = "arn:aws:dynamodb:us-east-1:554995069609:table/Music";

async function exportTables() {
  const client = new DynamoDBClient({ region: "us-east-1" });
  try {
    return await client.send(
      new ExportTableToPointInTimeCommand({
        S3Bucket: s3_bucket_name,
        TableArn: table_arn,
        ExportFormat: "DYNAMODB_JSON",
        ExportTime: new Date("Thud Dec 16 2021 16:46:00 GMT-0600 (CST)"),
        S3Prefix: "DYNAMOExport",
        S3SseAlgorithm: "AES256",
      })
    );
  } catch (err) {
    console.error(err);
  }
}

exportTables()
  .then((data) =>
    console.log("ExportTables succeeded:", JSON.stringify(data, null, 2))
  )
  .catch((error) => console.error(JSON.stringify(error, null, 2)));
