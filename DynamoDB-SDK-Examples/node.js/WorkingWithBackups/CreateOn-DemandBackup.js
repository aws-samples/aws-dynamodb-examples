// A simple script to create an on-demand backup of a DynamoDB table.

const { DynamoDBClient, CreateBackupCommand } = require('@aws-sdk/client-dynamodb'); // ES Modules import

const REGION = "us-west-2";
const TableName = "Music";
const BackupName = TableName + "-backup-" + Date.now(); //add an epoch time to the end of the name

async function createBackup() {
    const client = new DynamoDBClient({ region: REGION });
    try {
        return await client.send(
            new CreateBackupCommand({
                BackupName: BackupName,
                TableName: TableName,
            },)
        );
    } catch (err) {
        console.error(err);
    }
}

createBackup()
    .then((data) => console.log(data))
    .catch((error) => console.log("An error occured while creating the on-demand backup:" + ' ' + error.message ));