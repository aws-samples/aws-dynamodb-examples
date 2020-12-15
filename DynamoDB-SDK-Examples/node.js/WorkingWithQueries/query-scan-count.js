const AWS = require("aws-sdk");

const documentClient = new AWS.DynamoDB.DocumentClient({ region: "us-west-2" });

const query = async () => {
  const response = await documentClient
    .query({
      TableName: "Music",
      KeyConditionExpression: "#pk = :pk and begins_with(#sk, :sk)",
      ExpressionAttributeNames: {
        "#pk": "Artist",
        "#sk": "SongTitle",
      },
      ExpressionAttributeValues: {
        ":pk": "Michael Jackson",
        ":sk": "A",
      },
    })
    .promise();

  console.log(
    `This query has scanned ${response.ScannedCount} items and returned ${response.Count} items in total`
  );

  if (response.LastEvaluatedKey) {
    console.log(
      `Not all items have been retrieved by this query. At least one another request is required to get all available items. The last evaluated key corresponds to ${JSON.stringify(
        response.LastEvaluatedKey
      )}`
    );
  }

  console.log(`Query response: ${JSON.stringify(response, null, 2)}`);
};

query().catch((error) => console.error(JSON.stringify(error, null, 2)));
