// A simple script to describe an on-demand backup of a DynamoDB table.

const { DynamoDBClient, DescribeBackupCommand } = require('@aws-sdk/client-dynamodb'); // ES Modules import

const REGION = "us-west-2";
const TableName = "<your-table-name>";
const AccountNumber = "<your-aws-account-number>";
const BackupID = "<your-backup-id>";

const BackupArn = "arn:aws:dynamodb:" + REGION + ":" + AccountNumber + ":table/"+ TableName + "/backup/" + BackupID;

async function DescribeBackup() {
    const client = new DynamoDBClient({ region: REGION });
    try {
        return await client.send(
            new DescribeBackupCommand({
                BackupArn: BackupArn,
            },)
        );
    } catch (err) {
        console.error(err);
    }
}

DescribeBackup()
    .then((data) => console.log(data))
    .catch((error) => console.log("An error occured while deleting a backup:" + ' ' + error.message ));