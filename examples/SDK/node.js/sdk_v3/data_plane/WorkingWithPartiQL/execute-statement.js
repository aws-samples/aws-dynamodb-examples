const REGION = "us-west-2";
// I am using the DynamoDB low level because the DocClient does not support executeStatement used with PartiQL
const { DynamoDB } = require("@aws-sdk/client-dynamodb");
const { unmarshall } = require("@aws-sdk/util-dynamodb");

// Create low level client
const dbclient = new DynamoDB({ region: REGION });

const pk = "TEAM";

// In PartiQL, we can execute statement with execute-statement which performs one action similar to Scan/Query.
const params = { Statement: `SELECT * FROM "copa-america" WHERE "pk" = ?`,
                Parameters: [{"S": pk}]
};

const executePartiQLStatement = async () => {
    return data = await dbclient.executeStatement(params);
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
