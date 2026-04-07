import {handler} from './index.js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '../.env'), quiet: true });

// import config from '../config.json' with { type: 'json' };

// This runs the test from the local cmd host. e.g.:
// node exec Reads.js 200 false true

const args = process.argv;
const expArgs = args.slice(2);

const expName = expArgs.length > 0 ? expArgs[0] : 'Reads.js';
const itemCount = expArgs.length > 1 ? expArgs[1] : 200;

const showEachRequest = expArgs.length > 2 ? expArgs[2] : false;
const waitForMinute = expArgs.length > 3 ? expArgs[3] : true;

// const bucketName = config['bucketName'];
const bucketName = process.env.TESTER_BUCKET;

console.log('bucketName: ', bucketName);


const request = {
    expName: expName,
    itemCount: itemCount,

    showEachRequest: showEachRequest,
    waitForMinute: waitForMinute, 
    
    bucketName: bucketName,
};

const result = await handler(request, null);


