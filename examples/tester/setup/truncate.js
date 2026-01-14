// Import the DynamoDB client
const { DynamoDBClient, ScanCommand } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, DeleteCommand } = require("@aws-sdk/lib-dynamodb");

const args = process.argv.slice(2);
const maxScans = 100;

// Create a DynamoDB client
const client = new DynamoDBClient({ region: "us-east-1" });
const docClient = DynamoDBDocumentClient.from(client);

// Define the parameters for the scan operation
let params = {
  TableName: args[0] || "MREC",
};

let keys = [];
let scanCount = 0;
let throttled = false;

const scanDelete = async () => {
  try {
    // params['Limit'] = 10;
    const data = await client.send(new ScanCommand(params));
    scanCount++;
    let itemCount = data.Items.length;

    data.Items.forEach(async (item, idx) => {
      const key = {PK: item['PK'].S, SK: item['SK'].S};
      params['Key'] = key;
      if(throttled) {   
        console.log('scanDelete() - throttled - waiting 2s');
        await new Promise(resolve => setTimeout(resolve, 2000));
        throttled = false;
      }

      const command = new DeleteCommand(params);

      try {
        const response = await docClient.send(command);

      } catch (error) { 
        if(error.name === 'ThrottlingException') {
            throttled = true;
        } else {
            console.error('Other err:\n' + JSON.stringify(error, null, 2));
        }

      }
      if(throttled) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log('scanDelete() - resuming');
        throttled = false;
      }

    });
    return {scanCount: scanCount, deleted : itemCount};

    console.log("Deleting : ", data.Items.length);
  } catch (err) {
    console.error("Error scanning table:", err);
  }
};

async function run() {

    let count = 1;
    let res = {scanCount: 0, deleted: 1};

    while (count < maxScans && res.deleted > 0) {
        try{
            res = await scanDelete();
        } catch(e) {
            console.error('Error in scanDelete()');

            console.error(e);
        }
        // res = await scanDelete();

        console.log(res);
        count++;
    }
  
};

run();


// // Execute the scan
// const res = await scanDelete();

// console.log("res : ", res);

// console.log("Scan count : ", scanCount);

