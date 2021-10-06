//Import AWS SDK and initialize DynamoDB with the region.
const REGION = "us-west-2";
const AWS = require('aws-sdk');
const dbclient = new AWS.DynamoDB({ region: REGION });

const createIndex=async()=>{
    let params = {
        TableName: 'copa-america',
        GlobalSecondaryIndexUpdates :{
            Create :{
                IndexName :"group_id-group_ranking-index",
                KeySchema:[
                    {
                        AttributeName:"group_id",
                        KeyType:"HASH"
                    },
                    {
                        AttributeName:"group_ranking",
                        KeyType:"RANGE"
                    }
                ],
                Projection :{
                    ProjectionType :"ALL"
                }
            }
        }
    }
    //Creating Indexes is supported with the updateTable API which takes the parameters such as IndexName, Schema for index and the projection.
    let response= await dbclient.updateTable(params).promise()
}

createIndex().catch((error) => console.error(JSON.stringify(error, null, 2)));