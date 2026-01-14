
import { S3Client, PutObjectCommand, GetObjectCommand, S3ServiceException } from "@aws-sdk/client-s3";

import config from '../config.json' with { type: 'json' };

const args = process.argv;
const expArgs = args.slice(2);
const job1 = expArgs[0];
const job2 = expArgs[1];

const client = new S3Client({});

const run = async () => {

    const job1Data = await getDatafile(config['bucketName'], job1, 'data.csv');
    const job2Data = await getDatafile(config['bucketName'], job2, 'data.csv');

    const finalLineNum = getFinalLineNumber(job1Data);

    const job3Data = job1Data + '\n' + renumberLines(removeFirstLine(job2Data), finalLineNum);

    async function uploader(objName, body) {

        const command = new PutObjectCommand({
            Bucket: config['bucketName'],
            Key: objName,
            Body: body,
        });
    
        try {
            const response = await client.send(command);
            // console.log('uploaded s3://' + config['bucketName'] + '/' + objName);
        } catch (caught) {
            console.error(JSON.stringify(caught, null, 2));
        }
    
    }

    const res = await uploader('exp/' + job2 + '/data.csv', job3Data);
    console.log('uploaded s3://' + config['bucketName'] + '/exp/' + job2 + '/data.csv');

};




const getDatafile = async(bucketName, experiment, file) => {

    // const client = new S3Client({});
    const command = new GetObjectCommand({  Bucket: bucketName, Key: 'exp/' + experiment + '/' + file});
    try {
        const response = await client.send(command);
        const body = await response.Body.transformToString();

        return body;

    } catch (error) {
        console.log('Error', error);
        return null;
    }   
}

const removeFirstLine = (str) => {
    return str.replace(/^.*\n/, '');
};

const getFinalLineNumber = (str) => {
    const lines = str.split('\n');
    return lines.length - 1;
}

const renumberLines = (str, finalLineNum) => {
    const lines = str.split('\n');
    let newLines = '';
    for (let i = 0; i < lines.length; i++) {
        const newVal = lines[i].substring(lines[i].indexOf(',') + 1, lines[i].length);
        newLines += (i + finalLineNum + 1) + ',' + newVal.trim()  + '\n';
    }
    return newLines;
};


// async function uploader(objName, body) {

//     command = new PutObjectCommand({
//         Bucket: config['bucketName'],
//         Key: objName,
//         Body: body,
//     });

//     try {
//         const response = await client.send(command);
//         console.log('uploaded s3://' + config['bucketName'] + '/' + objName);
//         // console.log('HTTP ' + response.$metadata.httpStatusCode + ' for s3://' + bucketName + '/' + key);
//     } catch (caught) {
//         console.error(JSON.stringify(caught, null, 2));
//     }

// }

void run().then(()=>{
    process.exit(1);
});
