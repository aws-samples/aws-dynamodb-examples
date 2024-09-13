const REGION = "us-west-2";
const { DynamoDB } = require("@aws-sdk/client-dynamodb");
const { unmarshall } = require("@aws-sdk/util-dynamodb");

// Create low level client
const dbclient = new DynamoDB({ region: REGION });

// In PartiQL, we can execute statement with execute-transaction which performs multiple operations similar to batch operations.
const params = [{
    Statement: `SELECT * FROM "copa-america" WHERE "pk" = 'MATCH'`,
}]

const executePartiQLStatement = async () => {
    return data = await dbclient.executeTransaction(params);
}

executePartiQLStatement()
    .then((data) => {
            //Iterate through the Items array returned in the data variable and then unmarshall the DynamoDB JSON format to "regular" json format.
            data.Items.forEach(function (item) {
                console.log(JSON.stringify(unmarshall(item), null, 2));
            });
        }
    )
    .catch((error) => console.error(JSON.stringify(error, null, 2)));
