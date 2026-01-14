import * as fs from 'node:fs/promises';
import {runJob} from "./lib/jobExec.js";
import {bucketUploader} from "./lib/s3.js";
import { fileURLToPath } from 'url';
import { URL } from 'url';
const __filename = fileURLToPath(import.meta.url);
const expName = __filename.substring(__filename.lastIndexOf('/')+1);

const tableName = 'mytable';
const operation = 'write';

let summary = {

    desc: 'Small item random writes',
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

    // *************************** Test small writes ***************************
    
    params = {
        experiment: expNum, 
        test: 'mytable small writes',
        operation: 'put', 
        targetTable: tableName, 
        items: itemCount, 
        PK: 'PK', 
        SK: 'SK', 
        jobFile: 'load-smallitems.js',

        maxUnitVelocity: 100,
        showEachRequest: showEachRequest,
        waitForMinute: waitForMinute

    };

        results = await runJob(params);
        console.log('put : ' + params['items'] + '\n');

        // *************************** Upload to S3 ***************************
    
        const fileData = await fs.readFile( '/tmp/' +  params.experiment + '/data.csv', 'utf-8');
    
        const key = 'exp/' + expNum + '/data.csv';
        const keySummary = 'exp/' + expNum + '/summary.json';
    
        const res = await bucketUploader(bucketName, key, fileData);
    
        const res2 = await bucketUploader(bucketName, keySummary, JSON.stringify(summary, null, 2));
    
        return results;


    
    // console.log('\nput : ' + params['items'] + '\n');

    // const fileData = await fs.readFile( '../public/experiments/' +  params.experiment + '/data.csv', 'utf-8');

    // const key = 'exp/' + expName + '/data.csv';
    // const keySummary = 'exp/' + expName + '/summary.json';

    // const res = await bucketUploader(config['bucketName'], key, fileData);
    // const res2 = await bucketUploader(config['bucketName'], keySummary, JSON.stringify(summary, null, 2));

    // console.log();

};


export {run};

// void run().then(()=>{
//     process.exit(1);
// });