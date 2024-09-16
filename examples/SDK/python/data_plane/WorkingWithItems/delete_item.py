# Simple delete item call, but with an optional condition expression to only delete if the postal code is a specific value
from __future__ import print_function  # Python 2/3 compatibility
import boto3, json
from botocore.exceptions import ClientError

dynamodb = boto3.resource('dynamodb', region_name='us-west-2')

table = dynamodb.Table('RetailDatabase')

try:
    response = table.delete_item(
        Key={
            'pk': "jim.bob",
            "sk": "metadata"
        },
        ConditionExpression="shipaddr.pcode = :val",
        ExpressionAttributeValues= {
            ":val": "98260"
        }
    )
except ClientError as e:
    if e.response['Error']['Code'] == "ConditionalCheckFailedException":
        print(e.response['Error']['Message'])
    else:
        raise
else:
    print("DeleteItem succeeded:")
    print(json.dumps(response, indent=4, sort_keys=True))