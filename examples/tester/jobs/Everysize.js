import * as fs from 'node:fs/promises';
import {bucketUploader} from "./lib/s3.js";
import {runJob} from "./lib/jobExec.js";

import { fileURLToPath } from 'url';
import { URL } from 'url';
const __filename = fileURLToPath(import.meta.url);
const expName = __filename.substring(__filename.lastIndexOf('/')+1);

const tableNames = ['MREC', 'MRSC'];

// const args = process.argv;
// const expName = args[1].substring(args[1].lastIndexOf('/')+1);

// const expArgs = args.slice(2);
// const itemCount = expArgs.length > 0 ? expArgs[0] : 400;
// const operation = expArgs.length > 1 ? expArgs[1] : 'write';  // or read

const maxUnitVelocity = 500;

let summary = {
    desc: 'Correlating item size and request latency for MREC and MRSC modes of DynamoDB Global Tables',
    type: 'Line',

    xAxisLabel: 'size',
    xAxisUnits: 'KB',
    xAttribute: 'PK',

    yAxisLabel: 'latency',
    yAxisUnits: 'ms',
    yAttribute: 'latency',

    expName: expName,

    charts: ['LS'] // xy scatter

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

    const expNum = 'E' + Math.floor(new Date().getTime() / 1000).toString();

    summary['itemCount'] = itemCount;

    let params;
    let results;



        // *************************** Test MREC writes ***************************

        params = {
            experiment: expNum, 
            test: 'MREC writes',
            region: 'us-east-1',
            operation: 'put', 
            targetTable: tableNames[0], 
            items: summary.itemCount, 
            PK: 'PK', SK: 'SK', jobFile: 'load-everysize.js',
            maxUnitVelocity: maxUnitVelocity,
            showEachRequest: showEachRequest,
            waitForMinute: waitForMinute
            
        };

        results = await runJob(params);
        console.log('put : ' + params['items']);
        console.log();

        // *************************** Test MRSC writes ***************************

        params = {
            experiment: expNum, 
            test: 'MRSC writes',
            region: 'us-east-1',
            operation: 'put', 
            targetTable: tableNames[1], 
            items: summary.itemCount, 
            PK: 'PK', SK: 'SK', jobFile: 'load-everysize.js',
            maxUnitVelocity: maxUnitVelocity,
            showEachRequest: showEachRequest,
            waitForMinute: waitForMinute
            
        };

        results = await runJob(params);
        console.log('put : ' + params['items']);
        console.log();


        // *************************** Test MRSC default reads *****************
    
        params = {
            experiment: expNum, 
            test: 'MRSC default reads', 
            operation: 'get',
            strength: 'default', 
            targetTable: tableNames[0], items: summary.itemCount, 
            PK: 'PK', SK: 'SK', jobFile: 'load-everysize.js',
            maxUnitVelocity: maxUnitVelocity,
            showEachRequest: showEachRequest,
            waitForMinute: waitForMinute
        };
    
        results = await runJob(params);
        console.log('got : ' + params['items']);
        console.log();
        
        // *************************** Test MRSC strong reads *****************
    
        params = {
            experiment: expNum, 
            test: 'MRSC strong reads', 
            operation: 'get',
            strength: 'strong', 
            targetTable: tableNames[1], items: summary.itemCount, 
            PK: 'PK', SK: 'SK', jobFile: 'load-everysize.js',
            maxUnitVelocity: maxUnitVelocity,
            showEachRequest: showEachRequest,
            waitForMinute: waitForMinute
        };
    
        results = await runJob(params);
        console.log('got : ' + params['items']);
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