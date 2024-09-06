const { DynamoDBClient, ScanCommand, DescribeTableCommand } = require('@aws-sdk/client-dynamodb');
const { program } = require('commander');

async function printDistinctPKs(region, tableName) {
    const dynamoDb = new DynamoDBClient({ region : region });

    const describeTableCommand = new DescribeTableCommand({ TableName: tableName });
    const table = await dynamoDb.send(describeTableCommand);
    const partitionKeyName = table.Table.KeySchema[0].AttributeName;
    const sortKeyName = table.Table.KeySchema[1].AttributeName;
    const sortKeyType = table.Table.AttributeDefinitions.find(attr => attr.AttributeName === sortKeyName).AttributeType;

    const MAX_SORT_KEY_VALUE_S = String.fromCharCode(0x10FFFF).repeat(256);
    const MAX_SORT_KEY_VALUE_N = '9.9999999999999999999999999999999999999E+125';
    const MAX_SORT_KEY_VALUE_B = Buffer.alloc(1024, 0xFF);
    let maxSortKeyValue = '';

    // Determine the maximum value of the sort key based on its type
    if (sortKeyType === 'S') {
        maxSortKeyValue = MAX_SORT_KEY_VALUE_S;
    } else if (sortKeyType === 'N') {
        maxSortKeyValue = MAX_SORT_KEY_VALUE_N;
    } else if (sortKeyType === 'B') {
        maxSortKeyValue = MAX_SORT_KEY_VALUE_B;
    } else {
        throw new Error(`Unsupported sort key type: ${sortKeyType}`);
    }

    let lastEvaluatedKey = null;

    while (true) {
        try {
            const scanParams = {
                TableName: tableName,
                Limit: 1,
                ExclusiveStartKey: lastEvaluatedKey,
                ProjectionExpression: 'pk',
            };

            const scanCommand = new ScanCommand(scanParams);
            const response = await dynamoDb.send(scanCommand);
            const items = response.Items;

            if (items && items.length > 0) {
                console.log(items[0].pk.S);
            }

            lastEvaluatedKey = response.LastEvaluatedKey;

            if (!lastEvaluatedKey) {
                break;
            }

            // Create a new key with the maximum value of the sort key
            lastEvaluatedKey = {
                [partitionKeyName]: lastEvaluatedKey[partitionKeyName],
                [sortKeyName]: { [sortKeyType]: maxSortKeyValue },
            };
        } catch (error) {
            if (error.code === 'InternalServerError' || error.code === 'ThrottlingException') {
                console.error(`Received an error: ${error.code}, retrying...`);
                await new Promise(resolve => setTimeout(resolve, 1000));
            } else {
                throw error;
            }
        }
    }
}

// Define CLI arguments
program
    .option('--table-name <tableName>', 'Name of the DynamoDB table')
    .option('--region <region>', 'AWS region for the DynamoDB table')
    .parse(process.argv);

const options = program.opts();

if (!options.region) {
    console.error('Error: --region option is required.');
    process.exit(1);
}

if (!options.tableName) {
    console.error('Error: --table-name option is required.');
    process.exit(1);
}

// Call the function with the specified table name and region
printDistinctPKs(options.region, options.tableName);

