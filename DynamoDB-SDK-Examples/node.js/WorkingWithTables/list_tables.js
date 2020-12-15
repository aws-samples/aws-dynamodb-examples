const AWS = require("aws-sdk");

const dynamodb = new AWS.DynamoDB({ region: "us-west-2" });

const listTables = async () => {
  const response = await dynamodb.listTables().promise();

  console.log(JSON.stringify(response, null, 2));
};

listTables().catch((error) => console.error(JSON.stringify(error, null, 2)));
