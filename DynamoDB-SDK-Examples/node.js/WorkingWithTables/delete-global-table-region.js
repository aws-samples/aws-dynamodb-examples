const AWS = require("aws-sdk");

const dynamodb = new AWS.DynamoDB({ region: "us-west-2" });

const tableName = "Music";

async function deleteGlobalTableRegion() {
  const params = {
    TableName: tableName,
    ReplicaUpdates: [
      {
        Delete: {
          RegionName: "ap-northeast-2",
        },
      },
    ],
  };

  const response = await dynamodb.updateTable(params).promise();
  return response;
}

deleteGlobalTableRegion()
  .then((data) => console.log(JSON.stringify(data, null, 2)))
  .catch((error) => console.error(JSON.stringify(error, null, 2)));
