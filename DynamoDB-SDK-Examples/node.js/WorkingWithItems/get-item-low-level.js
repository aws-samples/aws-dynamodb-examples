/*
This example uses the low level DynamoDB client with the getItem call to get one item from DynamoDB.
 */

const { DynamoDB } = require('@aws-sdk/client-dynamodb');

async function getItem() {
    const params = {
        TableName: "RetailDatabase",
        Key: {
            pk: {S: "jim.bob@somewhere.com"},
            sk: {S: "metadata"}
        },
    };

    const client = new DynamoDB({region: "us-west-2"});
    return await client.getItem(params);
}

getItem()
    .then((data) =>
        console.log("GetItem succeeded:", JSON.stringify(data.Item, null, 2))
    )
    .catch((error) => console.error(JSON.stringify(error, null, 2)));