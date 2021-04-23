// A simple script to create an on-demand capacity mode DynamoDB table.

const { DynamoDBClient, CreateTableCommand } = require('@aws-sdk/client-dynamodb');

const REGION = "us-west-2";
const TableName = "Music";

const dbclient = new DynamoDBClient({ region: REGION });

async function createTable() {
    const params = {
        AttributeDefinitions: [
            {
                AttributeName: "Artist",
                AttributeType: "S",
            },
            {
                AttributeName: "SongTitle",
                AttributeType: "S",
            },
        ],
        KeySchema: [
            {
                AttributeName: "Artist",
                KeyType: "HASH", // Partition key
            },
            {
                AttributeName: "SongTitle",
                KeyType: "RANGE", // Sort key
            },
        ],
        BillingMode: "PAY_PER_REQUEST",
        TableName: TableName, // Substitute your table name for "Music"
    };
    return await dbclient.send( new CreateTableCommand(params));
}

createTable()
    .then((data) => console.log(data))
    .catch((error) => console.log("An error occured while deleting the table:" + ' ' + error.message ));