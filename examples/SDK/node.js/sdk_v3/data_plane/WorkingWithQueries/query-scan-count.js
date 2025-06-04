import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "us-west-2" });
const docClient = DynamoDBDocumentClient.from(client);

const query = async () => {
  const params = {
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
  };

  try {
    // Send the query command
    const response = await docClient.send(new QueryCommand(params));

    // Check if there are more results to retrieve
    if (response.LastEvaluatedKey) {
      console.log(
        `Not all items have been retrieved by this query. At least one another request is required to get all available items. The last evaluated key corresponds to ${JSON.stringify(response.LastEvaluatedKey)}.`
      );
    }

    const { ScannedCount: scannedCount, Count: count } = response;

    console.log(`This query has scanned ${scannedCount} items and returned ${count} items in total`);

    return response;
  } catch (error) {
    console.error("Error querying DynamoDB:", error);
    throw error;
  }
};

query()
  .then((response) => console.log(`Query response: ${JSON.stringify(response, null, 2)}`))
  .catch((error) => console.error(JSON.stringify(error, null, 2)));
