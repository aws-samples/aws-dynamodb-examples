import * as fs from 'node:fs/promises';
import {bucketUploader} from "./lib/s3.js";
import {runJob} from "./lib/jobExec.js";
import { fileURLToPath } from 'url';
import { URL } from 'url';
const __filename = fileURLToPath(import.meta.url);
const expName = __filename.substring(__filename.lastIndexOf('/')+1);

const tableName = 'mytable';
const operation = 'read';
    
let summary = {

    expName: expName,
    desc: 'Small item random reads',

    type: 'Line',

    xAxisLabel: 'request',
    xAxisUnits: '#',
    xAttribute: 'requestNum',

    yAxisLabel: 'latency',
    yAxisUnits: 'ms',
    yAttribute: 'latency',

    operation: operation,

    charts: ['LA','HI'] // latency simple and histogram

};


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

    // *************************** Test small reads ***************************
    params = {
        experiment: expNum, 
        test: 'mytable small reads',
        operation: 'get', 
        targetTable: tableName, items: itemCount, 
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


};

export {run};

// if(expName === arg1) {
//     void run().then(()=>{
//         process.exit(1);
//     });
// }
