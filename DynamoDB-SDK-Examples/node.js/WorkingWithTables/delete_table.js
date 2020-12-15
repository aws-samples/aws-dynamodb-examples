const AWS = require("aws-sdk");

const dynamodb = new AWS.DynamoDB({ region: "us-west-2" });

const deleteTable = async () => {
  const response = await dynamodb
    .deleteTable({ TableName: "Music" }) // Substitute your table name for "Music"
    .promise();

  console.log("Table has been deleted");
};

deleteTable().catch((error) => console.error(JSON.stringify(error, null, 2)));
