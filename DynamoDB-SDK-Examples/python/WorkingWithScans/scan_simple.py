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
        TableName=table_name
    )

    # Print number of items returned
    print("Items Returned: {}".format(len(response['Items'])))

except ClientError as error:
    print("Something went wrong: ")
    print(error.response['ResponseMetadata'])