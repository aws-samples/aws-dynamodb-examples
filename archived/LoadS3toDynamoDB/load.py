# Restore from S3 bucket to DynamoDB table
# customize the settings here and run: python3 load.py

import boto3
from botocore.exceptions import ClientError
import json
import gzip


bucketName  = 's3-export-demo'
exportName  = '01615234235014-59974ef8'

tableName   = 'restored'
tableRegion = 'us-east-2'
PKeyName    = 'PK'
SKeyName    = 'SK'

s3 = boto3.resource(
    's3',
    region_name='us-west-2'
)

dynamodb = boto3.client('dynamodb', region_name=tableRegion)


def execute_put_item(dynamodb_client, input):
    try:

        itemInput = {"TableName":tableName, "Item": input}

        response = dynamodb_client.put_item(**itemInput)

        print("Successfully put item.")
        # Handle response

    except ClientError as error:
        print(error)
    except BaseException as error:
        print("Unknown error while putting item: " + error.response['Error']['Message'])


def process_gzfile(bucket, obj):
    object = s3.Object(bucketName, obj)

    with gzip.GzipFile(fileobj=object.get()["Body"]) as gzipfile:
        content = gzipfile.read().decode('utf-8')
        itemList = content.split('\n')

        for item in itemList:
            if item:
                itemDict = json.loads(item)['Item']
                execute_put_item(dynamodb, itemDict)
                # print(itemDict[PKeyName]['S'], itemDict[SKeyName]['S'])
                # print(json.loads(content)['Item'])

def main():

    object = s3.Object(bucketName, 'AWSDynamoDB/' + exportName + '/manifest-files.json')
    manifest = object.get()['Body'].read().decode('utf-8')

    manifestList = manifest.split('\n')

    for fileEntry in manifestList:
        if fileEntry:
            file = json.loads(fileEntry)
            itemCount = file['itemCount']
            dataFileS3Key = file['dataFileS3Key']
            if(itemCount > 0):

                # print(itemCount, dataFileS3Key)
                process_gzfile(bucketName, dataFileS3Key)


if __name__ == "__main__":
    main()
