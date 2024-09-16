const {
    DynamoDBClient,
    CreateTableCommand,
    DescribeTableCommand,
    PutItemCommand,
} = require('@aws-sdk/client-dynamodb');
const { program } = require('commander');

const S_TABLE_NAME = 'max-str-sk-test-nodejs';
const N_TABLE_NAME = 'max-num-sk-test-nodejs';
const B_TABLE_NAME = 'max-bin-sk-test-nodejs';
const MAX_SORT_KEY_VALUE_S = String.fromCharCode(0x10FFFF).repeat(256);
const MAX_SORT_KEY_VALUE_N = "9.9999999999999999999999999999999999999e+125";
const MAX_SORT_KEY_VALUE_B = Buffer.alloc(1024, 0xFF);

let dynamoDb = undefined;

async function createTable(tableName, skType) {

    console.log(`Creating Table ${tableName}`);

    const createTableParams = {
        TableName: tableName,
        KeySchema: [
            { AttributeName: 'pk', KeyType: 'HASH' },
            { AttributeName: 'sk', KeyType: 'RANGE' },
        ],
        AttributeDefinitions: [
            { AttributeName: 'pk', AttributeType: 'S' },
            { AttributeName: 'sk', AttributeType: skType },
        ],
        BillingMode: 'PAY_PER_REQUEST'
    };

    const createTableCommand = new CreateTableCommand(createTableParams);

    try {
        await dynamoDb.send(createTableCommand);
        console.log(`Table ${tableName} created successfully`);
    } catch (error) {
        console.error('Error creating table:', error);
    }
}

async function waitForTablesReady() {
    for (const tableName of [S_TABLE_NAME, N_TABLE_NAME, B_TABLE_NAME]) {
        console.log(`Waiting for Table ${tableName} to be ready`);
        let isReady = false;

        while (!isReady) {
            const describeTableCommand = new DescribeTableCommand({ TableName: tableName });
            const response = await dynamoDb.send(describeTableCommand);
    
            if (response.Table.TableStatus === 'ACTIVE') {
                isReady = true;
                console.log(`Table "${tableName}" is ready`);
            } else {
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
    }
}

async function insertItem(tableName, skType, skValue) {
    const putItemParams = {
        TableName: tableName,
        Item: {
            pk: { S: 'sample-pk-value' },
            sk: { [skType]: skValue },
        },
    };

    const putItemCommand = new PutItemCommand(putItemParams);

    try {
        const response = await dynamoDb.send(putItemCommand);
        console.log(`Item inserted successfully into table "${tableName}"`);
    } catch (error) {
        console.error(`Error inserting item in table ${tableName}: ${error}`);
    }
}

async function main(region) {
    dynamoDb = new DynamoDBClient({ region: region });

    await createTable(S_TABLE_NAME, 'S');
    await createTable(N_TABLE_NAME, 'N');
    await createTable(B_TABLE_NAME, 'B');
    await waitForTablesReady();
    await insertItem(S_TABLE_NAME, 'S', MAX_SORT_KEY_VALUE_S);
    await insertItem(N_TABLE_NAME, 'N', MAX_SORT_KEY_VALUE_N);
    await insertItem(B_TABLE_NAME, 'B', MAX_SORT_KEY_VALUE_B);
}

// Define CLI arguments
program
    .option('--region <region>', 'AWS region for the DynamoDB table')
    .parse(process.argv);

const options = program.opts();

if (!options.region) {
    console.error('Error: --region option is required.');
    process.exit(1);
}

// Call the main function with the specified region
main(options.region);

