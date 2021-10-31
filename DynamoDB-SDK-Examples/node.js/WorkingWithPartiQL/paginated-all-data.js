const REGION = "us-west-2";
// I am using the DynamoDB low level because the DocClient does not support executeStatement used with PartiQL
const { DynamoDB } = require("@aws-sdk/client-dynamodb");
const { unmarshall } = require("@aws-sdk/util-dynamodb");

// Create low level client
const dbclient = new DynamoDB({ region: REGION });

let isDone = false
// In PartiQL, we can execute statement with execute-statement which performs one action similar to Scan operation and returns NextToken which could be used to retrieve the next page/set of records.
let params = {
    Statement: `SELECT * from "cars-demo"`,
    NextToken: nextToken
}

while (!isDone) {
    try {
        let response = await dbclient.executeStatement(params);
        /*  Returns response as Items and NextToken if the statement execution has more items.
            {
                "Items":[],
                "NextToken":""
            }
         */
        //Iterate through the Items array returned in the data variable and then unmarshall the DynamoDB JSON format to "regular" json format.
        data.Items.forEach(function (item) {
            console.log(JSON.stringify(unmarshall(item), null, 2));
        });
        if (data.NextToken != undefined) {
            params.NextToken = data.NextToken
        } else {
            isDone = true;
        }
    } catch (error) {
        console.error(JSON.stringify(error, null, 2));
    }
}

