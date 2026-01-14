import * as fs from 'node:fs/promises';
import {runJob} from "./lib/jobExec.js";
import {bucketUploader} from "./lib/s3.js";

import { fileURLToPath } from 'url';
import { URL } from 'url';
const __filename = fileURLToPath(import.meta.url);
const expName = __filename.substring(__filename.lastIndexOf('/')+1);

const args = process.argv;


// const expArgs = args.slice(2);
// const itemCount = expArgs.length > 0 ? expArgs[0] : 200;

// const showEachRequest = expArgs.length > 1 ? expArgs[1] : false;
// const waitForMinute = expArgs.length > 2 ? expArgs[2] : true;

// const operation = expArgs[1] || 'write';

const tableNames = ['MREC', 'MRSC'];

let summary = {

    desc: 'Comparing small item request latency for MREC and MRSC modes of DynamoDB Global Tables',
    type: 'Line',

    xAxisLabel: 'request',
    xAxisUnits: '#',
    xAttribute: 'requestNum',

    yAxisLabel: 'latency',
    yAxisUnits: 'ms',
    yAttribute: 'latency',

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

    //  // *************************** Test MREC writes ***************************
    params = {
        experiment: expNum, 
        test: 'MREC writes',
        operation: 'put', 
        targetTable: tableNames[0], items: summary.itemCount, 
        PK: 'PK', 
        SK: 'SK', 
        jobFile: 'load-smallitems.js',
        showEachRequest: showEachRequest,
        waitForMinute: waitForMinute
    };

    results = await runJob(params);
    console.log('put : ' + summary.itemCount);
    console.log('-');

    // // *************************** Test MRSC writes ***************************

    params = {
        experiment: expNum, 
        test: 'MRSC writes',  
        operation: 'put',   
        targetTable: tableNames[1], items: summary.itemCount, 
        PK: 'PK', SK: 'SK', jobFile: 'load-smallitems.js',
        showEachRequest: showEachRequest,
        waitForMinute: waitForMinute
    };

    results = await runJob(params);
    console.log('put : ' + summary.itemCount);
    console.log('-');

    // *************************** Test MRSC default reads *****************

    params = {
        experiment: expNum, 
        test: 'MRSC default reads', 
        operation: 'get',
        strength: 'default', 
        targetTable: tableNames[1], items: summary.itemCount, 
        PK: 'PK', SK: 'SK', jobFile: 'load-smallitems.js',
        showEachRequest: showEachRequest,
        waitForMinute: waitForMinute
    };

    results = await runJob(params);
    console.log('got : ' + summary.itemCount);
    console.log('-');

    // *************************** Test MRSC strong reads *****************

    params = {
        experiment: expNum, 
        test: 'MRSC strong reads', 
        operation: 'get',
        strength: 'strong', 
        targetTable: tableNames[1], items: summary.itemCount, 
        PK: 'PK', SK: 'SK', jobFile: 'load-smallitems.js',
        showEachRequest: showEachRequest,
        waitForMinute: waitForMinute
    };

    results = await runJob(params);
    console.log('got : ' + summary.itemCount);
    console.log('-');


        // // *************************** Test MREC conditional writes ***************************
        // params = {
        //     experiment: expName, 
        //     test: 'MREC conditional writes',
        //     operation: 'put', 
        //     targetTable: tableNames[0], items: summary.itemCount, 
        //     PK: 'PK', SK: 'SK', jobFile: 'load-smallitems.js',
        //     conditionalWrite: 'true'
            
        // };
    
        // results = await runJob(params);
        // console.log('put : ' + params['items']);
        // console.log();
    
        // // *************************** Test MRSC conditional writes ***************************
    
        // params = {
        //     experiment: expName, 
        //     test: 'MRSC conditional writes',  
        //     operation: 'put',   
        //     targetTable: tableNames[1], items: summary.itemCount, 
        //     PK: 'PK', SK: 'SK', jobFile: 'load-smallitems.js',
        //     conditionalWrite: 'true'
        // };
    
        // results = await runJob(params);
        // console.log('put : ' + params['items']);
        // console.log();


   // *************************** Upload to S3 ***************************

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