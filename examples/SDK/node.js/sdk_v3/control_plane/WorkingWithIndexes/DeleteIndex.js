// A simple example to delete a global secondary index (GSI) on an existing table DynamoDB table.

const { DynamoDBClient, UpdateTableCommand } = require('@aws-sdk/client-dynamodb'); // ES Modules import

const REGION = "us-west-2";
const TableName = "Music";
const IndexName = "SongTitle-Artist-index";

async function deleteIndex() {
    const client = new DynamoDBClient({ region: REGION });
    try {
        return await client.send(
            new UpdateTableCommand({
                TableName: TableName,
                GlobalSecondaryIndexUpdates: [ {
                    Delete: {
                        IndexName: IndexName,
                    }
                }],
            },)
        );
    } catch (err) {
        console.error(err);
    }
}

deleteIndex()
    .then((data) => console.log(data))
    .catch((error) => console.log("An error occurred while creating the index:" + ' ' + error.message ));