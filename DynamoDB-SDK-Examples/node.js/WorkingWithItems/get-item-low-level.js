
const { DynamoDB } = require('@aws-sdk/client-dynamodb');
async function getItems() {
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

getItems()
    .then((data) =>
        console.log("GetItem succeeded:", JSON.stringify(data.Item, null, 2))
    )
    .catch((error) => console.error(JSON.stringify(error, null, 2)));