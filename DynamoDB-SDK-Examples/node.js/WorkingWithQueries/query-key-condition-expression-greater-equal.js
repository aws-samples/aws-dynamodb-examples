const AWS = require('aws-sdk');

AWS.config.update({ region: "us-west-2" });

const documentClient = new AWS.DynamoDB.DocumentClient();

const query = async () => {
	try {
		const q = {
			TableName: 'Thread',
			IndexName: 'ForumViews-index',
			KeyConditionExpression: '#fn = :name AND #views >= :views',
			ExpressionAttributeNames: {
				'#fn': 'ForumName',
				'#views': 'Views',
			},
			ExpressionAttributeValues: {
				':name': "Amazon DynamoDB",
				':views': 0
			},
		};

		const response = await documentClient.query(q).promise();

		if (response.LastEvaluatedKey) {
			const message = `
				Not all items have been retrieved by this query.
				At least one another request is required to get all available items.
				The last evaluated key corresponds to:
				${JSON.stringify(response.LastEvaluatedKey)}.
			`.replace(/\s+/gm, ' ');

			console.log(message);
		}

		return response;
	} catch (error) {
		throw new Error(JSON.stringify(error, null, 2));
	}
};

(async () => {
	try {
		const data = await query();
		console.log("Query succeeded:", JSON.stringify(data, null, 2));
	} catch (error) {
		console.error(error);
	}
})();
