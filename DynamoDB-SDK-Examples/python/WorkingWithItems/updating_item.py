from __future__ import print_function  # Python 2/3 compatibility
import boto3, json
from botocore.exceptions import ClientError

dynamodb = boto3.resource('dynamodb', region_name='us-west-2')

table = dynamodb.Table('RetailDatabase')

# Update the name of a user account. Note that in this example, we have to alias "name" using ExpressionAttributeNames as name is a reserved word in DynamoDB.
try:
    response = table.update_item(
        Key={
            'pk': "jim.bob",
            "sk": "metadata"
        },
        ExpressionAttributeNames={"#n": "name"},
        UpdateExpression="set #n = :nm",
        ExpressionAttributeValues={
            ':nm': "Big Jim Bob"
        },
        ReturnValues="UPDATED_NEW"
    )
except ClientError as e:
    print(e.response['Error']['Message'])
else:
    print("GetItem succeeded:")
    print(json.dumps(response, indent=4, sort_keys=True))