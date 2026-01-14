const getResponse = {
    '$metadata': {
      httpStatusCode: 200,
      requestId: 'DVM3POOJIM3S0NMHC477IQ8PJNVV4KQNSO5AEMVJF66Q9ASUAAJG',
      attempts: 1,
      totalRetryDelay: 0
    },
    Item: {}
};


import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export const mainClient = async () => {

    const command = new GetItemCommand({
        ConsistentRead: false,
        TableName: "mytable",
        Key: {
            PK: { S: "C-64" },
            SK: { S: "0" }
        }
    });

    const response = await client.send(command);

    return response;
};

export const mainDocClient = async () => {

    const command = new GetCommand({
      TableName: "mytable",
      Key: {
        PK: "C-64",
        SK: "0"
      }
    });
  
    const response = await docClient.send(command);

    return response;
  };

const resClient = await mainClient();
console.log(resClient['$metadata']);

console.log('----------------------------------');

const resDocClient = await mainDocClient();
console.log(resDocClient['$metadata']);


