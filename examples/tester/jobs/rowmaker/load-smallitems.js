// job to create a lot of small items
import { payloadData, randomString, randomElement} from '../lib/util.js';

const rowMaker = (tick, second) => {
    const tickOffset = tick + 20;
    const newRow = {
        PK: 'C-' + tick.toString(),
        SK: '0',
        category: 'cat-' + randomElement(['A', 'B', 'C', 'D', 'E']),
        product: randomString(10),
        rating: (tick * 2).toString(),
        price: 100 + tick

    };
    return newRow;
}

const jobInformation = () => {
    return {
        jobType: 'insert',
        targetTable: 'MREC',
        PK: 'PK',
        conditionalWrite: 'true',
        description: 'Load table with many small items'
    };
}

export {rowMaker, jobInformation};
