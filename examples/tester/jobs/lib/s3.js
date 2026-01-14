import { PutObjectCommand, S3Client, S3ServiceException, HeadBucketCommand } from "@aws-sdk/client-s3";

const bucketUploader = async (bucketName, objName, body) => {

        const client = new S3Client({
            followRegionRedirects: true
        });
        
        let putCommand = null;

        putCommand = new PutObjectCommand({
            Bucket: bucketName,
            Key: objName,
            Body: body,
        });

        try {
            const putResponse = await client.send(putCommand);
            console.log('uploaded s3://' + bucketName + '/' + objName);
            
            // console.log('HTTP ' + response.$metadata.httpStatusCode + ' for s3://' + bucketName + '/' + key);
            
        } catch (caught) {
            console.log('error uploading to s3 bucket ' + bucketName + ' :');
            console.error(JSON.stringify(caught, null, 2));
        }
        return 'ok';
}


export {bucketUploader};

