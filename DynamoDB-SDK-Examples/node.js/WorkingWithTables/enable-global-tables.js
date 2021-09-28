/*
This code is a little more complicated as in order to enable Global Tables,
DynamoDB Streams must first be enabled on the table. If it is not enabled, this
code example enables it, waits until it is actually enabled (it takes a few seconds),
and then actually enables Global Tables on the table in question.
 */

const { DynamoDB,
    DynamoDBClient,
    DescribeTableCommand,
    UpdateTableCommand,
    waitForTableExists,
    UpdateGlobalTableCommand,
    CreateGlobalTableCommand
} = require('@aws-sdk/client-dynamodb');

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
    const response = await dbclient.send( new UpdateTableCommand(params));
    //return await waitForTableExists({ maxWaitTime: 20, maxDelay: 5, minDelay: 1 }, { TableName: TableName }  );

}

async function isStreamsEnabled() {
    const params = { TableName: TableName };
    const response = await dbclient.send(new DescribeTableCommand(params));
    return response.Table.StreamSpecification.StreamEnabled;
};

isStreamsEnabled()
    .then((data) => console.log(data))
/*    .then((isEnabled) => {
        if (!isEnabled) {
            enableStreams();
            console.log("woah!");
        }
    }
    .then (() => {
        enableGlobalTables();
    }) */
    .catch((error) => console.log("An error occured while checking if DynamoDB Streams are enabled:" + ' ' + error.message ));

enableStreams()
    .then((data) => console.log(data))
    .catch((error) => console.log(error));

/*
enableGlobalTables()
    .then((data) => console.log(JSON.stringify(data, null, 2)))
    .catch((error) => console.error(JSON.stringify(error, null, 2)));

      await dynamodb.waitFor("tableExists", { TableName: "Music" }).promise();


Call function to check to see if streams are enabled on the table.
If true, call enable global tables function. If there is an error, log error and quit.
If false, enable streams and wait until they are enabled. Once enabled, log success and quit.
If error, log an error and quit.

*/


