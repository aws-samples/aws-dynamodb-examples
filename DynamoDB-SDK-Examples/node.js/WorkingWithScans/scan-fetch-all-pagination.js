/*
This code uses a page size of 100 and will bring back all items in a table.
It uses the "low-level" JS client, not the DocumentClient, thus the data is
returned in DynamoDB's native JSON format. If you want plain JSON, you can
either convert this to use the DocumentClient or use unmarshall util
*/

const { DynamoDBClient, paginateScan } = require('@aws-sdk/client-dynamodb');

const dynamodb = new DynamoDBClient({});

async function fetchAll() {
    const config = {
        client: dynamodb,
        pageSize: 100
    };
    const input = {
        TableName: 'RetailDatabase'
    };
    const paginator = paginateScan(config, input);
    for await (const page of paginator) {
        page.Items.forEach(console.log);
    }
}

fetchAll()
    .then(() => console.log('done'))
    .catch(() => process.exit(1));