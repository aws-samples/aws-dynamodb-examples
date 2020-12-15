from __future__ import print_function # Python 2/3 compatibility
import boto3, json, decimal
from boto3.dynamodb.conditions import Key, Attr
from botocore.exceptions import ClientError

dynamodb = boto3.resource('dynamodb', region_name='us-west-2') #replace region name with your target region

table = dynamodb.Table("RetailDatabase") #replace table name with your own

# Batch write 3 items into the table
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
                'road': '89105 Bakken Rd',
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
                'road': '12341 Fish Rd',
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
                'road': '45678 Deer Lake Rd',
                'city': 'Clinton',
                'pcode': 98236,
                'state': 'WA',
                'country': 'USA'
            }
        }
    )