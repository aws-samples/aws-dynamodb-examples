const AWS = require('aws-sdk');

AWS.config.update({ region: "us-west-2" });

const documentClient = new AWS.DynamoDB.DocumentClient();

const query = async () => {
    try {
        const q = {
            TableName: 'ParcelTracker',
            "ScanIndexForward": false,
            "Limit": "1",
            KeyConditionExpression: '#id = :id and begins_with(#dt, :dt)',
            ExpressionAttributeNames: {
                '#id': 'TrackID',
                '#dt': 'ObjType',
            },
            ExpressionAttributeValues: {
                ':id': "34234ZX89734292834845234",
                ':dt': "package::tracking::status",
            },
        };

        const response = await documentClient.query(q).promise();

        /* In this query's case, we only want one item, but there are likely more in
        the table. If we care, we'd uncomment this and be able to grab the remaining
        items in the item collection.

        if (response.LastEvaluatedKey) {
            const message = `
				Not all items with this TrackID have been retrieved by this query.
				At least one other request is required to get all available items.
				The last evaluated key corresponds to:
				${JSON.stringify(response.LastEvaluatedKey)}.
			`.replace(/\s+/gm, ' ');
            console.log(message);
        }*/

        return response;
    } catch (error) {
        throw new Error(JSON.stringify(error, null, 2));
    }
};

(async () => {
    try {
        const data = await query();
        console.log(JSON.stringify(data.Items[0], null, 2));
    } catch (error) {
        console.error(error);
    }
})();
