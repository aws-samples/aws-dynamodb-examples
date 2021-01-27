const REGION = "us-west-2";
// I am using the DynamoDB low level because the DocClient does not support executeStatement used with PartiQL
const { DynamoDB } = require("@aws-sdk/client-dynamodb");
const { unmarshall } = require("@aws-sdk/util-dynamodb");

// Create low level client
const dbclient = new DynamoDB({ region: REGION });

const executePartiQLStatement = async () => {
    // In PartiQL, the single quotes and double quotes matter. Double quotes are used to signify variable names,
    // single quotes are for string literals. Notice the info.directors where I am getting the array of directors
    // inside of the info map object.
    const params = {
        Statement: `SELECT info.directors FROM Movies WHERE "year" = 2016 AND "title" = 'The Flash'`,
    }
    return data = await dbclient.executeStatement(params);
}

executePartiQLStatement()
    .then((data) => {
            //Iterate through the Items array returned in the data variable and then unmarshall the DynamoDB JSON format to "regular" json format.
            data.Items.forEach(function (item) {
                //const doc = unmarshall(item);
                console.log(JSON.stringify(unmarshall(item), null, 2));
            });
        }
    )
    .catch((error) => console.error(JSON.stringify(error, null, 2)));
