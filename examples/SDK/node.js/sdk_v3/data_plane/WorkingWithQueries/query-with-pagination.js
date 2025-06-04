// This example uses an extended version of the ProductCatalog data set
// https://gist.github.com/jprivillaso/7063b5e082ed2f553b697d40c60c473e

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "us-west-2" });
const docClient = DynamoDBDocumentClient.from(client);

const queryPaginatedData = async (pageSize, lastKey) => {
  const params = {
    TableName: "Thread",
    KeyConditionExpression: "#forumName = :forumName",
    ExpressionAttributeNames: {
      "#forumName": "ForumName",
    },
    ExpressionAttributeValues: {
      ":forumName": "Amazon DynamoDB",
    },
    // This represents the amount of records per page. It's not needed, but we'll use it to
    // simulate the pagination
    Limit: pageSize,
    ScanIndexForward: true,
  };

  // The ExclusiveStartKey marks where the next page should start.
  // DynamoDB will return ${pageSize} items beyond this point
  if (lastKey) {
    params.ExclusiveStartKey = lastKey;
  }

  try {
    const response = await docClient.send(new QueryCommand(params));

    if (response.LastEvaluatedKey) {
      console.log(
        `Not all items have been retrieved by this query. At least one another request is required to get all available items. The last evaluated key corresponds to ${JSON.stringify(response.LastEvaluatedKey)}.`
      );
    }

    return response;
  } catch (error) {
    console.error("Error querying DynamoDB:", error);
    throw error;
  }
};



const queryData = async () => {
  console.log("---------------------Page 1---------------------");
  const {
    Items: dataPage1,
    LastEvaluatedKey: lastKeyPage1,
  } = await queryPaginatedData(2, null);

  console.log(`Query succeeded Page 1: ${JSON.stringify(dataPage1, null, 2)}`);
  console.log(`Last Evaluated Key Page 1: ${JSON.stringify(lastKeyPage1, null, 2)}`, );

  // The example contains 8 items in the table. If you query the data with a page size 2,
  // you'll need to continue querying the data
  console.log("---------------------Page 2---------------------");
  const {
    Items: dataPage2,
    LastEvaluatedKey: lastKeyPage2,
  } = await queryPaginatedData(2, lastKeyPage1);

  console.log(`Query succeeded Page 2: ${JSON.stringify(dataPage2, null, 2)}`);
  console.log(`Last Evaluated Key Page 2: ${JSON.stringify(lastKeyPage2, null, 2)}`, );
};

queryData().catch((error) => console.error(JSON.stringify(error, null, 2)));
