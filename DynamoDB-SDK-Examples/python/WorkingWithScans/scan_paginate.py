from __future__ import print_function  # Python 2/3 compatibility
import boto3
from botocore.exceptions import ClientError

# Create Client
session = boto3.session.Session()
dynamoDbClient = session.client('dynamodb')

table_name = 'AmazonBins'

# Track number of Items read
item_count = 0

try:
    # Get first 1MB of data
    response = dynamoDbClient.scan(
        TableName=table_name
    )

except ClientError as error:
    print("Something went wrong: ")
    print(error.response['ResponseMetadata'])

# Track number of Items read
item_count += len(response['Items'])

# Paginate returning up to 1MB of data each iteration
while 'LastEvaluatedKey' in response:
    try:
        response = dynamoDbClient.scan(
            TableName=table_name,
            ExclusiveStartKey=response['LastEvaluatedKey']
        )
        # Track number of Items read
        item_count += len(response['Items'])

    except ClientError as error:
        print("Something went wrong: ")
        print(error.response['ResponseMetadata'])


print("Total number of items found: {}".format(item_count))
