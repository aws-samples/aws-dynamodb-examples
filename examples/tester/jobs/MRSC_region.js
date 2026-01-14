import * as fs from 'node:fs/promises';
import {bucketUploader} from "./lib/s3.js";
import {runJob} from "./lib/jobExec.js";

// import exp from 'node:constants';

const tableNames = ['MREC', 'MRSC'];

const region = process.env.AWS_REGION || 'us-east-1';

const args = process.argv;
const expName = args[1].substring(args[1].lastIndexOf('/')+1);

let summary = {

    desc: 'Comparing small item request latency by region, for DynamoDB Global Tables MRSC mode',
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
    let testName;
    
    // *************************** Test MRSC writes ***************************

    params = {
        experiment: expNum, 
        test: 'MRSC writes ' + region,  
        operation: 'put',   
        targetTable: tableNames[1], 
        items: summary.itemCount, 
        PK: 'PK', SK: 'SK', jobFile: 'load-smallitems.js',
    };

    results = await runJob(params);
    console.log('put : ' + params['items']);
    console.log('-');


    // *************************** Test MRSC strong reads *****************

    params = {
        experiment: expNum, 
        test: 'MRSC strong reads ' + region, 
        operation: 'get',
        strength: 'strong', 
        targetTable: tableNames[1], 
        items: summary.itemCount, 
        PK: 'PK', SK: 'SK', jobFile: 'load-smallitems.js',
    };

    results = await runJob(params);
    console.log('got : ' + params['items']);
    console.log('-');

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