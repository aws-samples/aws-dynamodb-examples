import {getCwStats} from './lib/aws.js';

const params = {
    TableName: 'mytable',
    operation: 'GetItem',
    StartTime: '1746402361',
    EndTime:   '1746402503',
    region: 'us-east-1'
};

const result = await getCwStats(params);

console.log('getCwStats result');
console.log(result['MetricDataResults']);
