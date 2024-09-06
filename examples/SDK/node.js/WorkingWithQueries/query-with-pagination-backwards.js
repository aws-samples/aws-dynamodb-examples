/**
 * This example uses an extended version of the ProductCatalog data set
 * https://gist.github.com/jprivillaso/7063b5e082ed2f553b697d40c60c473e
 */
const AWS = require("aws-sdk");

AWS.config.update({ region: "us-west-2" });

const documentClient = new AWS.DynamoDB.DocumentClient();

const printLastEvalMessage = (lastEvaluatedKey) => {
  const message = `
    Not all items have been retrieved by this query.
    At least one another request is required to get all available items.
    The last evaluated key corresponds to:
    ${JSON.stringify(lastEvaluatedKey)}.
  `.replace(/\s+/gm, " ");

  console.log(message);
};

const queryPaginatedData = async (pageSize, lastKey, scanForward) => {
  try {
    const params = {
      TableName: "Thread",
      KeyConditionExpression: "#forumName = :forumName",
      ExpressionAttributeNames: {
        "#forumName": "ForumName",
      },
      ExpressionAttributeValues: {
        ":forumName": "Amazon DynamoDB",
      },
      /**
       * This represents the amount of records per page. It's not needed, but we'll use it to simulate
       * the pagination
       */
      Limit: pageSize,
      ScanIndexForward: scanForward, // Default value is true
    };

    /**
     * The ExclusiveStartKey marks where the next page should start.
     * DynamoDB will return ${pageSize} items beyond this point
     */
    if (lastKey) params.ExclusiveStartKey = lastKey;

    const response = await documentClient.query(params).promise();

    if (response.LastEvaluatedKey) {
      printLastEvalMessage(response.LastEvaluatedKey);
    }

    return response;
  } catch (error) {
    throw new Error(JSON.stringify(error, null, 2));
  }
};

(async () => {
  try {
    console.log("---------------------Page 1---------------------");
    const {
      Items: dataPage1,
      LastEvaluatedKey: lastKeyPage1,
    } = await queryPaginatedData(2, null, true);
    console.log(
      "Query succeeded Page 1:",
      JSON.stringify(
        dataPage1.map((d) => d.Subject),
        null,
        2
      )
    );
    console.log("Last Evaluated Key Page 1:", lastKeyPage1);

    /**
     * The example contains 8 items in the table. If you query the data with a page size 2,
     * you'll need to continue querying the data
     */
    console.log("---------------------Page 2---------------------");
    const {
      Items: dataPage2,
      LastEvaluatedKey: lastKeyPage2,
    } = await queryPaginatedData(2, lastKeyPage1, true);
    console.log(
      "Query succeeded Page 2:",
      JSON.stringify(
        dataPage2.map((d) => d.Subject),
        null,
        2
      )
    );
    console.log("Last Evaluated Key Page 2:", lastKeyPage2);

    /**
     * Now let's scan backwards. Be aware that scanning backwards is not inclusive. It
     * will return all the possible data before the LastEvaluatedKey provided.
     */
    console.log("---------------------Backwards-------------------");
    const {
      Items: dataPage3,
      LastEvaluatedKey: lastKeyPage3,
    } = await queryPaginatedData(2, lastKeyPage2, false);
    console.log(
      "Query succeeded Page 1:",
      JSON.stringify(
        dataPage3.map((d) => d.Subject),
        null,
        2
      )
    );
    console.log("Last Evaluated Key Page 1:", lastKeyPage3);
  } catch (error) {
    console.error(error);
  }
})();
