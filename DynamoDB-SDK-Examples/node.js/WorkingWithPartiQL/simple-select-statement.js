const AWS = require("aws-sdk");
const converter = require('aws-sdk/lib/dynamodb/converter.js');
AWS.config.update({ region: "us-west-2" });

const dynamodb = new AWS.DynamoDB();

async function executePartiQLStatement() {
    // In PartiQL, the single quotes and double quotes matter. Double quotes are used to signify variable names, single quotes are for string literals.
    // Notice the info.directors where I am getting the array of directors inside of the info map object.
    const params = {
        Statement: `SELECT info.directors FROM Movies WHERE "year" = 2016 AND "title" = 'The Flash'`,
    }
    const response = await dynamodb.executeStatement(params).promise();
    return response;
}

executePartiQLStatement()
    .then((data) => {
            //Iterate through the Items array returned in the data variable and then unmarshall the DynamoDB JSON format to "regular" json format.
            data.Items.forEach(function (item) {
                const doc = converter.unmarshall(item);
                console.log(JSON.stringify(doc, null, 2));
            });
        }
    )
    .catch((error) => console.error(JSON.stringify(error, null, 2)));
