
from __future__ import print_function # Python 2/3 compatibility
import boto3

dynamodb = boto3.resource('dynamodb', region_name='us-west-2')

table = dynamodb.create_table(
    TableName="Music",  # Substitute your table name for RetailDatabase
    BillingMode="PAY_PER_REQUEST",
    KeySchema=[
        {
            'AttributeName': 'Artist',
            'KeyType': 'HASH'  #Partition key
        },
        {
            'AttributeName': 'SongTitle',
            'KeyType': 'RANGE'  #Sort key
        }
    ],
    AttributeDefinitions=[
        {
            'AttributeName': 'Artist',
            'AttributeType': 'S'
        },
        {
            'AttributeName': 'SongTitle',
            'AttributeType': 'S'
        },
    ],
)

table.meta.client.get_waiter('table_exists').wait(TableName='Music')
print('Table has been created, please continue to insert data.')