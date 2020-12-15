from __future__ import print_function # Python 2/3 compatibility
import boto3, json, decimal
from boto3.dynamodb.conditions import Key, Attr
from botocore.exceptions import ClientError

dynamodb = boto3.resource('dynamodb', region_name='us-west-2')

table = dynamodb.Table("RetailDatabase")

try:
    response = table.meta.client.transact_write_items(
        RequestItems={
            'RetailDatabase': {
                'Keys': [
                    {
                        'pk': your_partition_key,
                        'sk': your_sort_key
                    },
                    {
                        'pk': your_partition_key2,
                        'sk': your_sort_key2
                    },
                ],
                'ConsistentRead': False # For my user case, this data it is not changed often so why not get the reads at half price? Your use case might be different and need True.
            }
        },
        ReturnConsumedCapacity='TOTAL'
    )
except ClientError as e:
    print(e.response['Error']['Message'])
else:
    item = response['Responses']
    print("BatchGetItem succeeded:")
    print(json.dumps(item, indent=4, cls=DecimalEncoder))



with table.batch_writer() as batch:
    batch.put_item(
        Item={
            'pk': 'vikram.johnson@somewhere.com',
            'sk': 'metadata',
            'username': 'vikj',
            'first_name': 'Vikram',
            'last_name': 'Johnson',
            'name': 'Vikram Johnson',
            'age': 31,
            'address': {
                'road': '910 Bakken Rd',
                'city': 'Greenbank',
                'pcode': 98253,
                'state': 'WA',
                'country': 'USA'
            }
        }
    )
    batch.put_item(
        Item={
            'pk': 'jose.schneller@somewhere.com',
            'sk': 'metadata',
            'username': 'joses',
            'first_name': 'Jose',
            'last_name': 'Schneller',
            'name': 'Jose Schneller',
            'age': 27,
            'address': {
                'road': '1234 Fish Rd',
                'city': 'Freeland',
                'pcode': 98249,
                'state': 'WA',
                'country': 'USA'
            }
        }
    )
    batch.put_item(
        Item={
            'pk': 'helga.ramirez@somewhere.com',
            'sk': 'metadata',
            'username': 'helgar',
            'first_name': 'Helga',
            'last_name': 'Ramirez',
            'name': 'Helga Ramirez',
            'age': 48,
            'address': {
                'road': '5678 Deer Lake Rd',
                'city': 'Clinton',
                'pcode': 98236,
                'state': 'WA',
                'country': 'USA'
            }
        }
    )