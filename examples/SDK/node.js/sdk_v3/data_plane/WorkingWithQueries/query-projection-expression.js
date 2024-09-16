const AWS = require("aws-sdk");

const documentClient = new AWS.DynamoDB.DocumentClient({ region: "us-west-2" });

const query = async () => {
  const response = await documentClient
    .query({
      TableName: "Music",
      ExpressionAttributeValues: {
        ":pk": "Michael Jackson",
      },
      KeyConditionExpression: "Artist = :pk",
      ProjectionExpression: "SongTitle, Album",
    })
    .promise();

  console.log(`Query response: ${JSON.stringify(response, null, 2)}`);
};

query().catch((error) => console.error(JSON.stringify(error, null, 2)));
