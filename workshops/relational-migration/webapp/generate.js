function generateDDB(tableMetadata, dataset) {
    let config = {
      newDateType:'S'
    };

    let tableJSON = JSON.parse(tableMetadata)['Table'];
    let ddbFormat = null;

    let ADs = tableJSON['AttributeDefinitions'];
    const Ks = tableJSON['KeySchema'];
    const keyList = {};
    Ks.map((key) => {
        keyList[key['AttributeName']] = 1;
    });

    if(!dataset) {
        let tmdFormatted = {
            "TableName": "",
            "KeySchema": [],
            "AttributeDefinitions": [],
            "BillingMode": "PAY_PER_REQUEST"
        };

        if('GlobalSecondaryIndexes' in tableJSON ) {
            tmdFormatted['GlobalSecondaryIndexes'] = tableJSON['GlobalSecondaryIndexes'];

            tableJSON['GlobalSecondaryIndexes'].forEach((gsi)=> {
                gsi['Projection'] = {"ProjectionType": "ALL"};
                keyList[gsi['KeySchema'][0]['AttributeName']] = 1;
                if(gsi['KeySchema'].length > 1) {
                    keyList[gsi['KeySchema'][1]['AttributeName']] = 1;
                }
            });
        }
        tmdFormatted['TableName'] = tableJSON['TableName'];
        tmdFormatted['KeySchema'] = tableJSON['KeySchema'];

        let newADs = [];
        ADs.forEach((attr, index)=> {
            if(Object.keys(keyList).includes(attr['AttributeName'])) {
                let attrType = attr['AttributeType'].slice(0,3);
                if(attrType === 'int') {
                    newADs.push({"AttributeName": attr["AttributeName"], "AttributeType": "N"});
                }
                if(attrType === 'var') {
                    newADs.push({"AttributeName": attr["AttributeName"], "AttributeType": "S"});
                }
                if(attrType === 'dat') {
                    newADs.push({"AttributeName": attr["AttributeName"], "AttributeType": config['newDateType']});
                }
            }
        });
        tmdFormatted['AttributeDefinitions'] = newADs;
        ddbFormat = tmdFormatted;

    } else { // dataset

        let dataJSON = JSON.parse(dataset);
        ddbFormat = dataJSON.map((item, index) => {
            let newItem = {};
            Object.keys(item).map((attr) => {
                let attrType = ADs.filter((attr2) => attr2['AttributeName'] === attr)[0]['AttributeType'];
                let attrTypeDDB = 'S';

                let attrVal = {};

                if(attrType.slice(0,3) === 'int') {
                    attrTypeDDB = 'N';
                    attrVal[attrTypeDDB] = item[attr];
                }
                if(attrType.slice(0,3) === 'var') {
                    attrTypeDDB = 'S';
                    attrVal[attrTypeDDB] = item[attr];
                }
                if(attrType.slice(0,3) === 'dat') {
                    attrTypeDDB = config.newDateType;
                    if(config.newDateType ===  'N') {
                        const myDate = Date.parse(item[attr]);
                        attrVal[attrTypeDDB] = myDate.toString().slice(0,-3);
                    } else {
                        attrVal[attrTypeDDB] = item[attr];
                    }
                }
                newItem[attr] = attrVal;
            });
            return newItem;
        });
        if(ddbFormat.length === 1) {
            ddbFormat = ddbFormat[0];
        }
    }
    return JSON.stringify(ddbFormat, null, 2);
}