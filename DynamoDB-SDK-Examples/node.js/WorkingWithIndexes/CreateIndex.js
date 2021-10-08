// A simple example that creates a new global secondary index (GSI) on an existing table DynamoDB table.

const { DynamoDBClient, UpdateTableCommand } = require('@aws-sdk/client-dynamodb'); // ES Modules import

const REGION = "us-west-2";
const TableName = "Music";
const IndexName = "MyIndex";

async function createIndex() {
    const client = new DynamoDBClient({ region: REGION });
    try {
        return await client.send(
            new UpdateTableCommand({
                TableName: TableName,
                AttributeDefinitions: [
                    {
                        AttributeName: "SongTitle",
                        AttributeType: "S",
                    },
                    {
                        AttributeName: "Artist",
                        AttributeType: "S",
                    },
                ],
                GlobalSecondaryIndexUpdates: [ {
                    Create: {
                        IndexName: IndexName,

                        KeySchema: [
                            {
                                AttributeName: "SongTitle",
                                KeyType: "HASH", // Partition key
                            },
                            {
                                AttributeName: "Artist",
                                KeyType: "RANGE", // Sort key
                            },
                        ],
                        Projection: {
                            ProjectionType : "ALL"
                        },
                        // If the base table is in on-demand mode, the ProvisionedThroughput object can be omitted entirely.
                        ProvisionedThroughput: {
                            ReadCapacityUnits: 5,
                            WriteCapacityUnits: 5,
                        },
                    }
                }],
            },)
        );
    } catch (err) {
        console.error(err);
    }
}

createIndex()
    .then((data) => console.log(data))
    .catch((error) => console.log("An error occured while creating the index:" + ' ' + error.message ));