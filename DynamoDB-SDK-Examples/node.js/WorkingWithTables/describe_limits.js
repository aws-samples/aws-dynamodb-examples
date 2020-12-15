const AWS = require("aws-sdk");

const dynamodb = new AWS.DynamoDB({ region: "us-west-2" });

const describeLimits = async () => {
  const response = await dynamodb.describeLimits().promise();

  console.log(JSON.stringify(response, null, 2));
};

describeLimits().catch((error) => console.error(JSON.stringify(error, null, 2)));
