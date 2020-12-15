const AWS = require("aws-sdk");

const dynamodb = new AWS.DynamoDB({ region: "us-west-2" });

const createTable = async () => {
  const response = await dynamodb
    .createTable({
      AttributeDefinitions: [
        {
          AttributeName: "Artist",
          AttributeType: "S",
        },
        {
          AttributeName: "SongTitle",
          AttributeType: "S",
        },
      ],
      KeySchema: [
        {
          AttributeName: "Artist",
          KeyType: "HASH", // Partition key
        },
        {
          AttributeName: "SongTitle",
          KeyType: "RANGE", // Sort key
        },
      ],
      BillingMode: "PAY_PER_REQUEST",
      TableName: "Music", // Substitute your table name for "Music"
    })
    .promise();

  await dynamodb.waitFor("tableExists", { TableName: "Music" }).promise();
  console.log("Table has been created, please continue to insert data");
};

createTable().catch((error) => console.error(JSON.stringify(error, null, 2)));
