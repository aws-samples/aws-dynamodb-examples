from __future__ import print_function # Python 2/3 compatibility
import boto3, json
from botocore.exceptions import ClientError

client = boto3.client('dynamodb', region_name='us-west-2')

try:
    response = client.transact_write_items(
        TransactItems=[
            {
                'Put': {
                    'TableName': 'RetailDatabase',
                    'Item': {
                        'PK': {
                            'S': '123'
                        },
                        'SK': {
                            'S': 'abc'
                        },
                        'User': {
                            'S': 'lhnng'
                        },
                        'Other': {
                            'S': 'Other attribute field'
                        },
                    },
                    'ConditionExpression': 'attribute_not_exists(PK)',
                }
            },
            {
                'Update': {
                    'TableName': 'RetailDatabase',
                    'Key': {
                        'PK': {
                            'S': '789'
                        },
                        'SK': {
                            'S': 'xyz'
                        }
                    },
                    'UpdateExpression': 'SET #o = :val',
                    'ExpressionAttributeValues': {
                        ':val': {
                            'S': 'Hello, updated value'
                        }
                    },
                    'ExpressionAttributeNames': {
                        '#o': 'Other'
                    }
                }
            }
        ]
    )
except ClientError as e:
    print(e)
    print(e.response['Error']['Message'])
else:
    print("Transact Write succeeded")
