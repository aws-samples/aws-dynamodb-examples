import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "us-west-2" });
const docClient = DynamoDBDocumentClient.from(client);

const query = async () => {
  // Define query parameters
  const params = {
    TableName: "ParcelTracker",
    ScanIndexForward: false,
    Limit: 1,
    KeyConditionExpression: "#id = :id and begins_with(#dt, :dt)",
    KeyConditionExpression: "#pk = :pk",
    ExpressionAttributeNames: {
      "#id": "TrackID",
      "#dt": "ObjType",
    },
    ExpressionAttributeValues: {
      ":id": "34234ZX89734292834845234",
      ":dt": "package::tracking::status",
    },
  };

  try {
    const response = await docClient.send(new QueryCommand(params));

    // In this query's case, we only want one item, but there are likely more in
    // the table. If we care, we'd uncomment this and be able to grab the remaining
    // items in the item collection.
    // // if (response.LastEvaluatedKey) {
    // //   console.log(
    // //     `Not all items have been retrieved by this query. At least one another request is required to get all available items. The last evaluated key corresponds to ${JSON.stringify(response.LastEvaluatedKey)}.`
    // //   );
    // // }

    return response;
  } catch (error) {
    console.error("Error querying DynamoDB:", error);
    throw error;
  }
};

query()
  .then((response) => console.log(`Query response: ${JSON.stringify(response, null, 2)}`))
  .catch((error) => console.error(JSON.stringify(error, null, 2)));
