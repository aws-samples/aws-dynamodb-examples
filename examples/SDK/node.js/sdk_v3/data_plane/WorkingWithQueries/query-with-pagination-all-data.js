/**
 * This example uses an extended version of the ProductCatalog data set
 * https://gist.github.com/jprivillaso/7063b5e082ed2f553b697d40c60c473e
 */
const AWS = require("aws-sdk");

AWS.config.update({ region: "us-west-2" });

const documentClient = new AWS.DynamoDB.DocumentClient();

async function* getDataIterator() {
  let done = false;

  /**
   * In this example, the pageSize is not needed. If you have so much data,
   * DynamoDB will return the LastEvaluatedKey and then you should continue
   * query again until the LastEvaluatedKey returned is null
   */
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

  while (!done) {
    const { Items, LastEvaluatedKey } = await documentClient
      .query(params)
      .promise();

    if (!LastEvaluatedKey) {
      done = true;
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
    throw new Error(JSON.stringify(error, null, 2));
  }
};

(async () => {
  try {
    /**
     * If you need to query all the data for any reason, you will need to continue
     * querying until the LastEvaluatedKey returned is null
     */
    const allData = await queryAllData();
    console.log("Should contain all the data ---");
    console.log("Query succeeded:", JSON.stringify(allData, null, 2));
  } catch (error) {
    console.error(error);
  }
})();
