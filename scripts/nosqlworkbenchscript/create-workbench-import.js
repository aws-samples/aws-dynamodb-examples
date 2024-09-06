// Model Generator
// A command line utility that connects to your live DynamoDB table
// requests the table metadata, and the first 1MB of items
// and generates a JSON model to be opened in the NoSQL Workbench
//
// You can pass in the name of the table as arg 1.
// Pipe the output to a model.json file.
// i.e.
//   node generateModel.js CustomerData >CustomerData.json
//
 
const AWS = require('aws-sdk');
AWS.config.region = process.env.AWS_REGION || 'us-west-2';
 
// AWS.config.endpoint = 'http://localhost:8000';
 
const DYNAMODB_TABLE = process.argv.length > 2 ? process.argv.slice(2)[0] : 'Customer360';
 
// console.log('Generating model from table: ' + DYNAMODB_TABLE);
 
 
const ModelName = DYNAMODB_TABLE;
const UserName = require("os").userInfo().username || '';
const now = new Date(); // "Nov 04, 2019, 12:06 PM",
 
const ModelMetadata = {
    "Author": UserName,
    "DateCreated": now.toDateString() + ' ' + now.toTimeString(),
    "DateLastModified": now.toDateString() + ' ' + now.toTimeString(),
    "Description": "A NoSQL Workbench model generated from table " + DYNAMODB_TABLE,
    "AWSService": "Amazon DynamoDB",
    "Version": "2.0"
};
 
const dynamodb = new AWS.DynamoDB();
 
const buildModel = (err, data) => {
 
    let model = {};
    model.ModelName = ModelName;
    model.ModelMetadata = ModelMetadata;
    model.DataModel = [];
 
    let t = data.Table;
    let ks = t.KeySchema;
    let ads = t.AttributeDefinitions;
 
    let pkName = ks[0].AttributeName;
    let pkType = ads.filter(item => item.AttributeName === pkName)[0].AttributeType;
 
    let skName = ks.length === 1 ? null : ks[1].AttributeName;
    let skType = ks.length === 1 ? null : ads.filter(item => item.AttributeName === skName)[0].AttributeType;
 
    let ka = {
        PartitionKey: {
            AttributeName: pkName,
            AttributeType: pkType
        }
    };
    if(skName) {
        ka.SortKey = {
            AttributeName: skName,
            AttributeType: skType
        };
    }
 
    const nka = ads.filter((item) => {
 
        return ![pkName, skName].includes(item.AttributeName);
 
    });
 
    let GSIs = [];
 
    if(t.GlobalSecondaryIndexes && t.GlobalSecondaryIndexes.length > 0) {
        t.GlobalSecondaryIndexes.map((item) => {
 
            let indexModel = {
                IndexName: item.IndexName,
                Projection: item.Projection
            };
 
            const GSIks = item.KeySchema;
 
            let GSIpkName = GSIks[0].AttributeName;
            let GSIpkType = ads.filter(item => item.AttributeName === GSIpkName)[0].AttributeType;
 
            let GSIskName = GSIks.length === 1 ? null : GSIks[1].AttributeName;
            let GSIskType = GSIks.length === 1 ? null : ads.filter(item => item.AttributeName === GSIskName)[0].AttributeType;
 
            let GSIka = {
                PartitionKey: {
                    AttributeName: GSIpkName,
                    AttributeType: GSIpkType
                }
            };
            if(GSIskName) {
                GSIka.SortKey = {
                    AttributeName: GSIskName,
                    AttributeType: GSIskType
                };
            }
 
            indexModel.KeyAttributes = GSIka;
 
            GSIs.push(indexModel);
 
        });
    }
 
    let knownAttrs = [pkName];
    if(skName) {
        knownAttrs.push(skName);
    }
 
    nka.map((item) => {
        knownAttrs.push(item.AttributeName);
    });
 
    // console.log(knownAttrs);
    // ------- get table item data
 
 
    const buildItemData = (err, data) => {
 
        if(data.Count > 0) {
 
            let tData = [];
 
 
            data.Items.map((item) => {
                let nulls = [];
 
                Object.keys(item).forEach((attr) => {
 
                    // Workbench must have every attribute name defined
                    const attrType = Object.keys(item[attr])[0];
 
                    if(!knownAttrs.includes(attr)) {
                        knownAttrs.push(attr);
 
                        nka.push({AttributeName: attr, AttributeType: attrType});
 
                    }
 
                    if(attrType === 'NULL') {
                        nulls.push(attr);
                    }
 
                });
 
                let itemNoNulls = {...item};
 
                nulls.map((nullkey) => {
                    delete itemNoNulls[nullkey];
                });
 
                tData.push(itemNoNulls);
 
            });
 
            model.DataModel.push({
                TableName: DYNAMODB_TABLE,
                KeyAttributes: ka,
                NonKeyAttributes: nka,
                GlobalSecondaryIndexes: GSIs,
                TableData: tData
            });
 
            console.log(JSON.stringify(model, null, 2));
 
        }
 
    };
 
    dynamodb.scan({TableName:DYNAMODB_TABLE}, buildItemData);
 
};
 
dynamodb.describeTable({TableName:DYNAMODB_TABLE}, buildModel);

