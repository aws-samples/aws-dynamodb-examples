from __future__ import print_function  # Python 2/3 compatibility
import boto3
from botocore.exceptions import ClientError

# Create Client
session = boto3.session.Session()
client = session.client('dynamodb')
table_name = 'AmazonBins'

# Create Paginator
paginator = client.get_paginator('scan')

# Set Starting Token
startingToken = None

# Initate Scan
response_iterator = paginator.paginate(
    TableName=table_name,
    ReturnConsumedCapacity='TOTAL',
    # Optional Filter
    ScanFilter={
        'quantity': {
            'AttributeValueList': [{'N': '9'}],
            'ComparisonOperator': 'EQ'
        }
    },
    PaginationConfig={
        'StartingToken': startingToken
    }
)

# Create Counters
count, total, scanned, iterations = 0, 0, 0, 0
items = []

# Iterate Response
for page in response_iterator:
    total += int(page['Count'])
    scanned += int(page['ScannedCount'])
    count+=len(page['Items'])
    iterations +=1
    for item in page['Items']:
        items.append(item)


# Total Number of Items Returned taken from length of 'Items' Arr
print("Total Number of Items: {}".format(count))

# Total Count taken from 'Count' Metric in Response
print("Total Count: {}".format(total))

# Total Number of Items Scanned to Return Desired Result
print("Total ScannedCount: {}".format(scanned))

# Number of Paginated Requests Made
print("Number of Scan Reqs: {}".format(iterations))

# Number of Items in Final Array of Items
print("Confirm Number of Items: {}".format(len(items)))