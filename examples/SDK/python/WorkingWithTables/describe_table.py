from __future__ import print_function  # Python 2/3 compatibility
import boto3, pprint

dynamodb = boto3.resource('dynamodb', region_name='us-west-2')

#table = dynamodb.Table("Music") # Substitute your table name for RetailDatabase

response = dynamodb.meta.client.describe_table(
    TableName='Music'
)

pprint.pprint(response)