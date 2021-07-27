// This code disables DynamoDB Streams on the target table.

const {DynamoDBClient, UpdateTableCommand } = require('@aws-sdk/client-dynamodb');

const REGION = "us-west-2";
const TableName = "Music";

const dbclient = new DynamoDBClient({ region: REGION });

async function disableStreams() {
    const params = {
        TableName: TableName,
        StreamSpecification: {
            StreamEnabled: false,
        },
    };
    return await dbclient.send( new UpdateTableCommand(params));
}

disableStreams()
    .then((data) => console.log(data))
    .catch((error) => console.log("An error occured while disabling streams:" + ' ' + error.message ));
