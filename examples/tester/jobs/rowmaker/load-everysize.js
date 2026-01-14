// job to load everysize table, with 400 items, each one having a size in KB equal to the key attribute size
import { payloadData, randomString, randomElement } from '../lib/util.js';

const rowMaker = (tick, second) => {
    const tickOffset = tick + 20;
    const newRow = {
        PK: tick.toString(),
        SK: '0',
        size: tick.toString(),
        category: 'cat-' + randomElement(['A', 'B', 'C', 'D', 'E']),
        product: randomString(5),
        payload: payloadData(tick - 0.3),
        price: 100 + tick
    };
    return newRow;
}

const jobInformation = () => {
    return {
        jobType: 'insert',
        targetTable: 'everysize',
        PK: 'PK',
        description: 'Load table with items ranging from 1 KB to 400 KB'
    };
}

export {rowMaker, jobInformation};
