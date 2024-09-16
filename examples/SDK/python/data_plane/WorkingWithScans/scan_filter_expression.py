from __future__ import print_function  # Python 2/3 compatibility
import boto3
from botocore.exceptions import ClientError

# Create Client
session = boto3.session.Session()
dynamoDbClient = session.client('dynamodb')

# Table Name
table_name = 'AmazonBins'

try:
    # Scan up to 1mb of data
    response = dynamoDbClient.scan(
        TableName=table_name, 
        FilterExpression='begins_with(#a, :r)',
        ExpressionAttributeValues={
            ':r': {
                'S': '159240'
                }
        },
        ExpressionAttributeNames={
            '#a': 'asin',
        }
    )

    # Print number of items returned
    print("Items Returned: {}".format(len(response['Items'])))

    # Show first item in list
    print(response['Items'][0])

except ClientError as error:
    print("Something went wrong: ")
    print(error.response['ResponseMetadata'])