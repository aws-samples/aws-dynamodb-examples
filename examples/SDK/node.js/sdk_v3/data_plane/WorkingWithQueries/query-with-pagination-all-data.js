// This example uses an extended version of the ProductCatalog data set
// https://gist.github.com/jprivillaso/7063b5e082ed2f553b697d40c60c473e

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "us-west-2" });
const docClient = DynamoDBDocumentClient.from(client);

async function* getDataIterator() {
  let isComplete = false;

  // In this example, the pageSize is not needed. If you have so much data,
  // DynamoDB will return the LastEvaluatedKey and then you should continue
  // query again until the LastEvaluatedKey returned is null

  const params = {
    TableName: "Thread",
    KeyConditionExpression: "#forumName = :forumName",
    ExpressionAttributeNames: {
      "#forumName": "ForumName",
    },
    ExpressionAttributeValues: {
      ":forumName": "Amazon DynamoDB",
    },
    ScanIndexForward: true, // Default value is true
  };

  while (!isComplete) {
    const { Items, LastEvaluatedKey } = await docClient.send(new QueryCommand(params));

    if (!LastEvaluatedKey) {
      isComplete = true;
    } else {
      params.ExclusiveStartKey = LastEvaluatedKey;
    }

    if (Items && Items.length > 0) {
      yield Items;
    }
  }
}

const queryAllData = async () => {
  try {
    const allData = [];

    for await (const dataBatch of getDataIterator()) {
      allData.push(...dataBatch);
    }
    return allData;
  } catch (error) {
    console.error("Error querying DynamoDB:", error);
    throw error;
  }
};

queryAllData()
  .then((response) => console.log(`All data: ${JSON.stringify(response, null, 2)}`))
  .catch((error) => console.error(JSON.stringify(error, null, 2)));
