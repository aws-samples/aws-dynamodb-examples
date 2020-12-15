from __future__ import print_function # Python 2/3 compatibility
import boto3, pprint

# create the resource we need to connect.
dynamodb = boto3.resource('dynamodb', region_name='us-west-2')

# get the table limits from the table object
response = dynamodb.meta.client.list_tables()

pprint.pprint(response)