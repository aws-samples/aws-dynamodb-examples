// A script to create indexes on DynamoDB with JS SDK v3.

//Import DynamoDBClient and UpdateTableCommand from AWS SDK v3 DynamoDB Client and initialize DynamoDB with the region.
const REGION = "us-west-2";
const { DynamoDBClient, UpdateTableCommand } = require('@aws-sdk/client-dynamodb');
const client = new DynamoDBClient({ region: REGION });

const createIndex = async () => {
    let params = {
        TableName: 'copa-america',
        AttributeDefinitions: [
            {
                AttributeName: "group_id",
                AttributeType: "S"
            },
            {
                AttributeName: "group_ranking",
                AttributeType: "S"
            }
        ],
        GlobalSecondaryIndexUpdates: [{
            Create: {
                IndexName: "group_id-group_ranking-index",
                KeySchema: [
                    {
                        AttributeName: "group_id",
                        KeyType: "HASH"
                    },
                    {
                        AttributeName: "group_ranking",
                        KeyType: "RANGE"
                    }
                ],
                Projection: {
                    ProjectionType: "ALL"
                }
            }
        }]
    }
    //Creating Indexes is supported with the UpdateTableCommand which takes the parameters such as IndexName, Schema for index and the projection.
    try {
        const command = new UpdateTableCommand(params);
        return await client.send(command);
    } catch (e) {
        console.error(JSON.stringify(e))
    }
}

createIndex()
    .then((data) => console.log(JSON.stringify(data, null, 2)))
    /*
        Consoles the response with TableDescription and the TableStatus as "UPDATING" 
    */
    .catch((error) => console.error(JSON.stringify(error, null, 2)));