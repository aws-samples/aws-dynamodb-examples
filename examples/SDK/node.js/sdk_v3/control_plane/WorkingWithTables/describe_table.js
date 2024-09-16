const AWS = require("aws-sdk");

const dynamodb = new AWS.DynamoDB({ region: "us-west-2" });

const describeTable = async () => {
  const response = await dynamodb
    .describeTable({ TableName: "Music" }) // Substitute your table name for "Music"
    .promise();

  //console.log(JSON.stringify(response, null, 2));
  let test = JSON.stringify(response.Table.StreamSpecification.StreamEnabled, null, 2)
  console.log(test)
};

describeTable().catch((error) => console.error(JSON.stringify(error, null, 2)));
