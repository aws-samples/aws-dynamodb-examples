import * as fs from 'node:fs/promises';
import { runPut, runGet, runWarm } from "./database.js";

const experimentResultsRoot = 'public/experiments';

const currentPath = process.cwd().split('/');
const currentFolder = currentPath.slice(-1)[0];

let pathToJobsFolder = '../';

// let pathToExperimentsFolder = './' + experimentResultsRoot + '/';
// if(currentFolder === 'jobs') {
//     pathToExperimentsFolder = './' + experimentResultsRoot + '/';
// }

let pathToExperimentsFolder = '/tmp/';


const runJob = async (params) => {
    // console.log('params: ', JSON.stringify(params,null,2));

    const expName = params['expName'] || null;
    const experiment = params['experiment'];
    const test = params['test'];
    const targetTable = params['targetTable'];
    const items = params['items'];
    const PK = params['PK'];
    const SK = params['SK'] || null;
    const operation = params['operation'];
    const strength = params['strength'] || null;  // reads: strong or eventual
    const conditionalWrite = params['conditionalWrite'] || 'false';
    const maxUnitVelocity = params['maxUnitVelocity'] || 1000;
    const maxUnitVelocityAdjusted = 0;

    let showEachRequest = params['showEachRequest'];
    let waitForMinute = params['waitForMinute'];

    if(!showEachRequest) { showEachRequest = false; }
    if(!waitForMinute) { waitForMinute = true; }

    // console.log('showEachRequest: ' + showEachRequest);
    // console.log('waitForMinute: ' + waitForMinute);
    // console.log('Job parameters :\n' + JSON.stringify(params, null, 2));

    const jobFile = params['jobFile'];

    const jobFileNameImport = pathToJobsFolder + '/rowmaker/' + jobFile;

    const job = await import(jobFileNameImport);
    const jobInfo = job.jobInformation();
    const jobResults = [];

    let nowSec;
    const sleep = ms => new Promise(r => setTimeout(r, ms));

    let jobSecond = 0;
    let previousJobSecond = 1;
    let jobTimestamp = 0;
    let jobTimestampMs = 0;
    let jobElapsed = 0;
    let requestsThisSecond = 0;
    let unitsThisSecond = 0;
    let unitsTotal = 0;

    let region = null;

    region = await runWarm(targetTable, PK, SK);

    // if(params['region']) {
    //     region = params['region'];
    // } else {
    //     region = await runWarm(targetTable, PK, SK);
    // }

    let startMs = Date.now();
    const startMsDate = new Date(startMs);

    let startSec = Math.floor(startMs/1000);
    let startSeconds = startMsDate.getSeconds();

    const msUntilNextSec = 1000 - (startMs - (startSec * 1000));
    const secondsUntilNextMin = 60 - startSeconds;

    //console.log('waitForMinute: ' + waitForMinute);

    if(waitForMinute === 'true' || waitForMinute === true) {
        startSec += secondsUntilNextMin; 
        console.log('Pausing for ' + secondsUntilNextMin + ' seconds, to start at the top of a minute');
        await sleep(secondsUntilNextMin * 1000);  // delay to start at the top of a minute
    } 
    
    await sleep(msUntilNextSec);              // delay to start at the top of a second
    
    // const nowNow = Date.now();
    // console.log('starting at nowNow: ');
    // console.log(new Date(nowNow));

    startMs = Date.now();
    let rowSummary = {};
    let newSecond = false;

    if(jobInfo.jobType.toUpperCase() === 'INSERT') {
        const rowLimit = 100000000;
        const loopLimit = Math.min(rowLimit, items);

        let unitsOver = 0;

        for(let rowNum = 1; rowNum <= loopLimit; rowNum++){ // **** iteration loop

            let httpStatusCode;
            let attempts; // aws sdk retry stat
            let totalRetryDelay; // aws sdk retry stat
            let requestId; // aws request identifier
            let capacityUnits = 0; // DynamoDB consumed capacity units
            
            const nowNow = Date.now();
            jobTimestamp = Math.floor(nowNow/1000);
            jobTimestampMs = nowNow - (jobTimestamp * 1000);
            jobElapsed = nowNow - startMs;

        
            // if(unitsThisSecond > maxUnitVelocity) {
            //     console.log('*****', jobTimestampMs, unitsThisSecond, maxUnitVelocity);

            //     // const sleepTime = Math.floor(1000 - (unitsThisSecond/maxUnitVelocity) * 1000);

            //     // console.log('\n*** too fast! sleeping for ' + (1000 - unitsThisSecond/maxUnitVelocity) + ' ms');
            //     // await sleep(1000 - unitsThisSecond/maxUnitVelocity);

            // }

            nowSec = Math.floor(nowNow/1000);

            jobSecond = nowSec - startSec;

            if (jobSecond === previousJobSecond) {
                
                newSecond = false;
                requestsThisSecond += 1;

                if(rowNum > 1) {
                    jobResults.push(rowSummary); // previous loop's summary here
                }

                if(unitsThisSecond >= maxUnitVelocity - unitsOver - 1) {
                    
                    const cooldownTime = 1000 - jobTimestampMs;

                    await sleep(cooldownTime);

                }

            } else {
                newSecond = true;
         
                // we detected a new second. Emit the previous loop's summary with last second's stats
                // console.log('Second : ' + jobSecond-1 + ' requests: ' + rowSummary['unitVelocity']);
                
                // rowSummary['unitVelocity'] = requestsThisSecond;
                
                unitsOver = Math.max(0, unitsThisSecond - maxUnitVelocity);
                const rightNow = new Date();
                console.log('Second : ' + (jobSecond-1) + ' requests: ' + requestsThisSecond + ', units consumed: ' + unitsThisSecond);

                if(rowNum > 1) {
                    jobResults.push(rowSummary);
                }

                requestsThisSecond = 1;
                unitsThisSecond = 0;

                previousJobSecond = jobSecond;
            }  

            const row = job.rowMaker(rowNum);  // ***** crux of the job system

            const pkValue = row[PK];
            const skValue = row[SK];

            let rowResult;

            try {
                if(operation === 'put') {
                    rowResult = await runPut(targetTable, row, conditionalWrite);

                    if(showEachRequest === 'true' || showEachRequest === true) {
                        if(newSecond === true) { console.log('-'); }
                        console.log('  row ' + rowNum + ', latency ' + rowResult['latency'] + ' ms');
                    }

                }
                if(operation === 'get') {
                    const key = {};

                    key[PK] = row[PK];
                    key[SK] = row[SK];
                    // console.log(key);

                    rowResult = await runGet(targetTable, key, strength);

                    if(showEachRequest === 'true' || showEachRequest === true) {

                        if(newSecond === true) { console.log('-'); }

                        console.log('  row ' + rowNum + ', latency ' + rowResult['latency'] + ' ms');
                    }
                }
                
            } catch (err) { 
                console.error('Error: ' + JSON.stringify(err, null, 2));
            }

            const rowMetadata = rowResult?.result?.$metadata || null;
            const rowMetadataErr = rowResult?.result?.error || null;

            httpStatusCode = rowMetadata.httpStatusCode || rowMetadataErr.code;
            attempts = rowMetadata.attempts || rowMetadataErr.attempts;

            totalRetryDelay = rowMetadata.totalRetryDelay || rowMetadataErr?.totalRetryDelay;
            requestId = rowMetadata.requestId || rowMetadataErr?.requestId;

            capacityUnits = rowResult?.result?.ConsumedCapacity?.CapacityUnits;

            unitsThisSecond += capacityUnits;

            rowSummary = {
                requestNum: rowNum,
                experiment: experiment,
                test: test,
                jobFile: jobFile,
                operation: operation,
                targetTable:targetTable,
                region: region,
                PK: pkValue,
                jobTimestamp: jobTimestamp,
                jobSecond: jobSecond,
                jobTimestampMs: jobTimestampMs,
                jobElapsed: jobElapsed,
                latency: rowResult?.latency,
                unitVelocity: unitsThisSecond,
                httpStatusCode: httpStatusCode,
                attempts: attempts,
                ConsumedCapacity: capacityUnits
            };

            // console.log('Row : ' + rowNum + ' : ' + JSON.stringify(rowSummary, null, 2));

            // if(params['region']) {
            //     rowSummary['region'] = 'us-east-1';
            // } else {
            //     rowSummary['region'] = endpointRegion;
            // }

            // normally, emit request stats after each request.
            // But, we will wait and do it once the next loop begins,
            // to see if we can include a complete second summary for a finished second.
            //
            // jobResults.push(rowSummary);

        }

        // console.log('Second : ' + (jobSecond) + ' requests: ' + requestsThisSecond);
        console.log('Second : ' + (jobSecond) + ' requests: ' + requestsThisSecond + ', units consumed: ' + unitsThisSecond);
                
                
        if(jobSecond === 1) {
            rowSummary['unitVelocity'] = requestsThisSecond;
        }
        jobResults.push(rowSummary); // final summary
    }

    const jrColumns = Object.keys(jobResults[0]);

    const resultsFileData = jobResults.map(
        (item, index) => {
            return('\n' + jrColumns.map((col, idx) => {
                return(item[col]);
            }) );
        }).join('');

    const dir = pathToExperimentsFolder + experiment;

    // make local folder and file
    await fs.mkdir(dir, { recursive: true });

    try {
        await fs.access(dir + '/data.csv', fs.constants.F_OK);
    } catch (err) {
        if(err?.code === 'ENOENT') {
            const dataFile = await fs.appendFile( dir + '/data.csv', jrColumns.toString(), 'utf-8', { flag: 'a' } );
        }
    }
    await fs.appendFile( dir + '/data.csv', resultsFileData, 'utf-8', { flag: 'a' } );

    // await fs.appendFile( dir + '/summary.json', resultsFileData, 'utf-8', { flag: 'a' } );

    return 'ok';
    // return jobResults;
    
}

export {runJob};