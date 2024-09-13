const AWS = require("aws-sdk");

const documentClient = new AWS.DynamoDB.DocumentClient({ region: "us-west-2" });

const query = async () => {
  const response = await documentClient
    .query({
      TableName: "Music",
      ExpressionAttributeNames: {
        "#pk": "Artist",
        "#yr": "Year",
      },
      ExpressionAttributeValues: {
        ":pk": "Michael Jackson",
        ":yr": 2012,
      },
      FilterExpression: "#yr = :yr",
      KeyConditionExpression: "#pk = :pk",
    })
    .promise();

  console.log(`Query response: ${JSON.stringify(response, null, 2)}`);
};

query().catch((error) => console.error(JSON.stringify(error, null, 2)));
