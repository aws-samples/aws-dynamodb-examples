from __future__ import print_function # Python 2/3 compatibility
import boto3, json, decimal
from boto3.dynamodb.conditions import Key, Attr
from botocore.exceptions import ClientError

client = boto3.client('dynamodb', region_name='us-west-2')

try:
    response = client.transact_get_items(
        TransactItems=[
            {
                'Get': {
                    'TableName': "RetailDatabase",
                    'Key': {
                        'PK': {
                            'S': '123'
                        },
                        'SK': {
                            'S': "abc"
                        },
                    },
                },
            },
            {
                'Get': {
                    'TableName': "RetailDatabase",
                    'Key': {
                        'PK': {
                            'S': "789"
                        },
                        'SK': {
                            'S': "xyz"
                        },
                    },
                },
            },
        ]
    )

    print(json.dumps(response))

except ClientError as e:
    print(e.response['Error']['Message'])