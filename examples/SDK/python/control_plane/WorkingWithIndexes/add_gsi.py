from __future__ import print_function # Python 2/3 compatibility
import boto3

dynamodb = boto3.resource('dynamodb', region_name='us-west-2')

table = dynamodb.Table("RetailDatabase") # Substitute your table name for RetailDatabase

table.update(
AttributeDefinitions=[
    {
        'AttributeName': 'status',
        'AttributeType': 'S'
    },
    {
        'AttributeName': 'GSI2-SK',
        'AttributeType': 'S'
    },
    ],
    GlobalSecondaryIndexUpdates=[
        {
            'Create': {
                'IndexName': 'VendorOrdersByStatusDate-ProductInventor',
                'KeySchema': [
                    {
                        'AttributeName': 'status',
                        'KeyType': 'HASH' # could be 'HASH'|'RANGE'
                    },
                    {
                        'AttributeName': 'GSI2-SK',
                        'KeyType': 'RANGE'  # could be 'HASH'|'RANGE'
                    },
                ],
                'Projection': {
                    'ProjectionType': 'KEYS_ONLY', # could be 'ALL'|'KEYS_ONLY'|'INCLUDE'

                },
            },
        },
    ],
)
