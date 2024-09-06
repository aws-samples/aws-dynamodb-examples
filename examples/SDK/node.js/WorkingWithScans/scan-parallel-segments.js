const AWS = require("aws-sdk");

AWS.config.update({ region: "us-west-2" });

const documentClient = new AWS.DynamoDB.DocumentClient();
const segments = 5;

// Define a total number segments to scan across, and execute multiple table scans asynchronously.
async function parallelScan(segments = 1) {
	let results = [];
	for (let i = 0; i < segments; i++) {
		let scan = documentClient
			.scan({
				TableName: "Products",
				FilterExpression: "#status = :status",
				ExpressionAttributeNames: {
					"#status": "ProductStatus",
				},
				ExpressionAttributeValues: {
					":status": "IN_STOCK",
				},
				TotalSegments: segments, // The total number of segments to scan across, in this case 5.
				Segment: i, // The segment index for this particular query, zero indexed, in this case 0-4.
			})
			.promise();
		// Push unsettled scan Promise into results array.
		results.push(scan);
	}
	// Use Promise.all to return all scan results as a single Promise.
	return Promise.all(results);
}

parallelScan(segments)
	.then((scans) => console.log("ParallelScan succeeded:", scans.length))
	.catch((error) => console.error(JSON.stringify(error, null, 2)));
