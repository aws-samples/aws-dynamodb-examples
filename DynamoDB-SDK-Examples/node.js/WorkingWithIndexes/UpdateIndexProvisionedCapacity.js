// A simple script to update the provisioned capacity of a global secondary index (GSI) on an existing table DynamoDB table.
// Note: this specific script does not alter a GSI's auto-scaling settings or Contributor Insights settings. That is a different script.

const { DynamoDBClient, UpdateTableCommand } = require('@aws-sdk/client-dynamodb'); // ES Modules import

const REGION = "us-west-2";
const TableName = "Music";
const IndexName = "SongTitle-Artist-index";

async function updateIndex() {
    const client = new DynamoDBClient({ region: REGION });
    try {
        return await client.send(
            new UpdateTableCommand({
                TableName: TableName,
                GlobalSecondaryIndexUpdates: [ {
                    Update: {
                        IndexName: IndexName,
                        ProvisionedThroughput: {
                            ReadCapacityUnits: 25,
                            WriteCapacityUnits: 25,
                        },
                    }
                }],
            },)
        );
    } catch (err) {
        console.error(err);
    }
}

updateIndex()
    .then((data) => console.log(data.TableDescription))
    .catch((error) => console.log("An error occured while updating the index capacity:" + ' ' + error.message ));