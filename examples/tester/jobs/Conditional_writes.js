import * as fs from 'node:fs/promises';
import {bucketUploader} from "./lib/s3.js";
import {runJob} from "./lib/jobExec.js";

import { fileURLToPath } from 'url';
import { URL } from 'url';
const __filename = fileURLToPath(import.meta.url);
const expName = __filename.substring(__filename.lastIndexOf('/')+1);


const operation = 'write';

const tableNames = ['MREC', 'MRSC', 'mytable'];

let summary = {

    desc: 'Comparing request latency of regular vs conditional writes in DynamoDB',
    type: 'Line',

    xAxisLabel: 'request',
    xAxisUnits: '#',
    xAttribute: 'requestNum',

    yAxisLabel: 'latency',
    yAxisUnits: 'ms',
    yAttribute: 'latency',

    operation: operation,
    expName: expName,

    charts: ['LA','HI'] // latency simple and histogram

};

console.log();
console.log('Experiment Description : ' + summary['desc']);
console.log();

const run = async (req) => {

    req['desc'] = summary['desc'];

    console.log('expName    : ' + req['expName']);
    console.log('itemCount  : ' + req['itemCount']);
    console.log('desc       : ' + req['desc']);
    console.log('bucketName : ' + req['bucketName']);
    console.log('---------------------------------');

    const itemCount = req['itemCount'] ? req['itemCount'] : 200;
    const showEachRequest = req['showEachRequest'] ? req['showEachRequest'] : false;
    const waitForMinute = req['waitForMinute'] ? req['waitForMinute'] : true;
    const bucketName = req['bucketName'];

    summary['itemCount'] = itemCount;


    const expNum = 'E' + Math.floor(new Date().getTime() / 1000).toString();

    let params;
    let results;

    //  *************************** Test single region table writes ***************************

    params = {
        experiment: expNum, 
        test: 'Writes',  
        operation: 'put',   
        targetTable: tableNames[2], items: summary.itemCount, 
        PK: 'PK', SK: 'SK', jobFile: 'load-smallitems.js'
    };

    results = await runJob(params);
    console.log('put : ' + params['items']);
    console.log();

    // // *************************** Test single region table conditional writes ***************************

    params = {
        experiment: expNum, 
        test: 'Conditional writes',  
        operation: 'put',   
        targetTable: tableNames[2], items: summary.itemCount, 
        PK: 'PK', SK: 'SK', jobFile: 'load-smallitems.js',
        conditionalWrite: 'true'
    };

    results = await runJob(params);
    console.log('put : ' + params['items']);
    console.log();


    // *************************** Upload to S3 ***************************
    // put folder and file in S3

        const fileData = await fs.readFile( '/tmp/' +  params.experiment + '/data.csv', 'utf-8');
    
        const key = 'exp/' + expNum + '/data.csv';
        const keySummary = 'exp/' + expNum + '/summary.json';
    
        const res = await bucketUploader(bucketName, key, fileData);
    
        const res2 = await bucketUploader(bucketName, keySummary, JSON.stringify(summary, null, 2));
    
        return results;

};

export {run};

// void run().then(()=>{
//     process.exit(1);
// });