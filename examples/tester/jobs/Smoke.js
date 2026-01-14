// smoke test of a single request to verify connectivity and latency

import { runPut, runGet, runWarm } from "./lib/database.js";

const args = process.argv;
const expArgs = args.slice(2);

const operation = expArgs[0] || 'put'; // put or get
const targetTable = expArgs[1] || 'mytable';
const conditionalWrite = expArgs[2] || false;

console.log('Smoke test operation:', operation, 'targetTable', targetTable);

let readStrength = 'eventual';

const primaryKey = {
    PK: 'C-0000',
    SK: '0'
};


if(operation === 'put') {

    const row = {
        product: 'car',
        category: 'street',
        price: 90,
        rating: 735
    };
    
    row['PK'] = primaryKey.PK;
    row['SK'] = primaryKey.SK;

    const rowResult = await runPut(targetTable, row, conditionalWrite);
    console.log('Put result:', JSON.stringify(rowResult, null, 2));
}

if(operation === 'get') {
    const rowResult = await runGet(targetTable, primaryKey, readStrength);
    console.log('Get result:', JSON.stringify(rowResult, null, 2));
}

// rowResult = await runPut(targetTable, row, conditionalWrite);

