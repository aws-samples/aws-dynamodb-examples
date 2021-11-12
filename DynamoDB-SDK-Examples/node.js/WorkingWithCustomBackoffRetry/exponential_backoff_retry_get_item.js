const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand } = require("@aws-sdk/lib-dynamodb");
const delay = ms => new Promise(res => setTimeout(res, ms));

const retryNamedExceptions = ['LimitExceededException',
    'ProvisionedThroughputExceededException',
    'RequestLimitExceeded',
    'ThrottlingException']

async function getItems() {
    let retries = 0;
    let condition = true;
    const MAX_RETRY = 7;
    const client = new DynamoDBClient({ region: "us-east-1", maxRetries: 0 });
    const ddbDocClient = DynamoDBDocumentClient.from(client);
    while (condition) {
        try {
            condition = false;
            return await ddbDocClient.send(
                new GetCommand({
                    TableName: "Music",
                    Key: {
                        artist: "batman0", // Partition Key
                        title: "happy0"          // Sort Key
                    },
                    ConsistentRead: false,
                })
            );
        } catch (err) {
            retries += 1;
            backoffTime = (2 ** retries);
            if (!retryNamedExceptions.includes(err.name)){
                console.log("Error has occurred: " + err.name);
                throw err;
            }
            if (retries < MAX_RETRY && retryNamedExceptions.includes(err.name)) {
                return delay(backoffTime);
            }
            else {
                condition = False;
                console.log("Max retry Done or not retriable");
                throw err;
            }
        }
    }
}

getItems()
    .then((data) =>
        console.log("GetItem succeeded:", JSON.stringify(data, null, 2)))
    .catch((error) => console.error(JSON.stringify(error, null, 2)));
