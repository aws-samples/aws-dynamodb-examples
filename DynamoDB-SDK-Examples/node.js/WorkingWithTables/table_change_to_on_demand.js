// A simple script to switch a table to on-demand capacity mode.

const { DynamoDBClient, UpdateTableCommand } = require('@aws-sdk/client-dynamodb');

const REGION = "us-west-2"; // Replace with your target region
const TableName = "Music"; // Replace with your table name.

const dbclient = new DynamoDBClient({ region: REGION });

async function updateTable() {
    const params = {
        BillingMode: "PAY_PER_REQUEST",
        TableName: TableName,
    };
    return await dbclient.send( new UpdateTableCommand(params));
    // Add code to wait for table update to complete before returning.
}

updateTable()
    .then((data) => console.log(data))
    .catch((error) => console.log("An error occured while updating the table:" + ' ' + error.message ));
