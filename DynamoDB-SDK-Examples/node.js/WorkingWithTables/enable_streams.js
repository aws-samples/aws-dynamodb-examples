const AWS = require("aws-sdk");

const dynamodb = new AWS.DynamoDB({ region: "us-west-2" });

const updateTable = async () => {
  const response = await dynamodb
    .updateTable({
      StreamSpecification: {
        StreamEnabled: true,
        StreamViewType: "NEW_AND_OLD_IMAGES", // Could be any of the following values 'NEW_IMAGE'|'OLD_IMAGE'|'NEW_AND_OLD_IMAGES'|'KEYS_ONLY'
      },
      TableName: "Music", // Substitute your table name for "Music"
    })
    .promise();

  await dynamodb.waitFor("tableExists", { TableName: "Music" }).promise();
  console.log("Table has been updated");
};

updateTable().catch((error) => console.error(JSON.stringify(error, null, 2)));
