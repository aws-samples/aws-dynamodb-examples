// A simple script to delete an on-demand backup of a DynamoDB table.

const { DynamoDBClient, DeleteBackupCommand } = require('@aws-sdk/client-dynamodb'); // ES Modules import

const REGION = "us-west-2";
const TableName = "<your-table-name>";
const AccountNumber = "<your-aws-account-number>";
const BackupID = "<your-backup-id>";
const BackupArn = "arn:aws:dynamodb:" + REGION + ":" + AccountNumber + ":table/"+ TableName + "/backup/" + BackupID;

async function createBackup() {
    const client = new DynamoDBClient({ region: REGION });
    try {
        return await client.send(
            new DeleteBackupCommand({
                BackupArn: BackupArn,
            },)
        );
    } catch (err) {
        console.error(err);
    }
}

createBackup()
    .then((data) => console.log(data))
    .catch((error) => console.log("An error occured while deleting a backup:" + ' ' + error.message ));