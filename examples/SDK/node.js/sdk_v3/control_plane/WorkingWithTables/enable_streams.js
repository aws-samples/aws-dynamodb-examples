// The StreamViewType can be any of the following values 'NEW_IMAGE'|'OLD_IMAGE'|'NEW_AND_OLD_IMAGES'|'KEYS_ONLY',
// but if you want to use Global Tables, it must be set to NEW_AND_OLD_IMAGES.

const {DynamoDBClient, UpdateTableCommand } = require('@aws-sdk/client-dynamodb');

const REGION = "us-west-2";
const TableName = "Music";

const dbclient = new DynamoDBClient({ region: REGION });

async function enableStreams() {
    const params = {
        TableName: TableName,
        StreamSpecification: {
            StreamEnabled: true,
            StreamViewType: "NEW_AND_OLD_IMAGES",
        },
    };
    return await dbclient.send( new UpdateTableCommand(params));
    // await waitForTableExists({ maxWaitTime: 20, maxDelay: 5, minDelay: 1 }, { TableName: TableName }  );
    // this code is commented out as there is something wrong with the waiters in v3. Once that is fixed, this code will be updated.
}

enableStreams()
    .then((data) => console.log(data))
    .catch((error) => console.log("An error occurred while enabling streams:" + ' ' + error.message ));
