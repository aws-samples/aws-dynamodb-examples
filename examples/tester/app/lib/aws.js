import { S3Client, ListObjectsV2Command, S3ServiceException, GetObjectCommand, NoSuchKey } from "@aws-sdk/client-s3";
import { STSClient, GetCallerIdentityCommand } from "@aws-sdk/client-sts";
import { CloudWatchClient, GetMetricDataCommand } from "@aws-sdk/client-cloudwatch";


const listFolders = async (bucketName) => {

      const s3Client = new S3Client({
        followRegionRedirects: true
      });
      const listParams = { Bucket: bucketName, Prefix: 'exp/', Delimiter: 'i' };  
  
      try {
          const data = await s3Client.send(new ListObjectsV2Command(listParams));
          if(!data || !data['Contents'] || data['Contents'].length === 0) {
              return([]);
          } else {
              return data['Contents'].map((x) => x.Key).map((x) => x.split('/')[1]).reverse();
          }
          
      } catch (error) {
          console.log('Error', error?.name);
          // console.log(JSON.stringify(error, null, 2));
          return {error: error?.name};
      }

};

const getDatafile = async(bucketName, experiment, file) => {

    const client = new S3Client({
        followRegionRedirects: true
    });
    const command = new GetObjectCommand({  Bucket: bucketName, Key: 'exp/' + experiment + '/' + file});
    try {
        const response = await client.send(command);
        const body = await response.Body.transformToString();

        return body;

    } catch (error) {
        console.log('Error', error);
        return null;
    }   
};

const getCallerIdentity = async () => {
    const client = new STSClient({});
    try {
        const data = await client.send(new GetCallerIdentityCommand({}));
        return data;
    } catch (error) {
        console.error("Error", error);
        return null;
    }
};


const getCwStats = async (params) => {
    // console.log(JSON.stringify(params, null, 2));

    const startTimeEpoch = params['StartTime'];
    const endTimeEpoch = params['EndTime'];
    const startTime = new Date(parseInt(startTimeEpoch)*1000);
    const endTime = new Date(parseInt(endTimeEpoch)*1000);
    const duration = (endTime - startTime) / 1000;

    // console.log('startTime : ' + startTime);
    // console.log('endTime   : ' + endTime);

    const queries = [
        {
            "Id": "avg",
            "MetricStat": {
                "Metric": {
                    "Namespace": "AWS/DynamoDB",
                    "MetricName": "SuccessfulRequestLatency",
                    "Dimensions": [{"Name": "TableName", "Value": params['TableName']}, {"Name": "Operation", "Value": params['operation']}]
                },
                "Period": duration, "Stat": ["Average"]
            }, "ReturnData": true,
        },
        {
            "Id": "max",
            "MetricStat": {
                "Metric": {
                    "Namespace": "AWS/DynamoDB",
                    "MetricName": "SuccessfulRequestLatency",
                    "Dimensions": [{"Name": "TableName", "Value": params['TableName']}, {"Name": "Operation", "Value": params['operation']}]
                },
                "Period": duration, "Stat": ["Maximum"]
            }, "ReturnData": true,
        },
        {
            "Id": "min",
            "MetricStat": {
                "Metric": {
                    "Namespace": "AWS/DynamoDB",
                    "MetricName": "SuccessfulRequestLatency",
                    "Dimensions": [{"Name": "TableName", "Value": params['TableName']}, {"Name": "Operation", "Value": params['operation']}]
                },
                "Period": duration, "Stat": ["Minimum"]
            }, "ReturnData": true,
        }

    ];


    const gmdParams = {
        "Region": params['region'],
        "MetricDataQueries" : queries,
        "StartTime": startTime,
        "EndTime":   endTime
    };
    
    // console.log(JSON.stringify(gmdParams, null, 2));

    const cwClient = new CloudWatchClient({ region: params['region'] });
    const command = new GetMetricDataCommand(gmdParams);
    const response = await cwClient.send(command);
    

    return response;

};

export {listFolders, getDatafile, getCallerIdentity, getCwStats};
