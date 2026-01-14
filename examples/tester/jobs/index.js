import * as fs from 'node:fs/promises';

const handler = async (event, context) => {

    // console.log('Event: ', event);
    const expName = event['expName'];

    const expFileNameImport = './' + expName;
    // console.log('expFileNameImport: ', expFileNameImport);

    const exp = await import(expFileNameImport);

    const response = await exp.run(event);

    return response;

};

export { handler };

