// A simple script to add provisioned capacity to an existing table.

const {DynamoDBClient, UpdateTableCommand } = require('@aws-sdk/client-dynamodb');

const REGION = "us-west-2";
const TableName = "Music"; //Change this to your table name

const dbclient = new DynamoDBClient({ region: REGION });

async function addCapacity() {
    const params = {
        TableName: TableName,
        ProvisionedThroughput: {
            ReadCapacityUnits: 10,
            WriteCapacityUnits: 5,
        },
    };
    return await dbclient.send( new UpdateTableCommand(params));
    // await waitForTableExists({ maxWaitTime: 20, maxDelay: 5, minDelay: 1 }, { TableName: TableName }  );
    // this code is commented out as there is something wrong with the waiters in v3. Once that is fixed, this code will be updated.
}

addCapacity()
    .then((data) => console.log(data))
    .catch((error) => console.log("An error occured while deleting the table:" + ' ' + error.message ));
