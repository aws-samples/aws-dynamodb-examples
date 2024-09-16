// Be advised that when you delete a table, it does not delete auto-scaling info (e.g. scalable
// targets, scaling policies) or CloudWatch alarms. This must be done in seperate calls.

from __future__ import print_function  # Python 2/3 compatibility
import boto3, pprint

dynamodb = boto3.resource('dynamodb', region_name='us-west-2')

table = dynamodb.Table("Music") # Substitute your table name for RetailDatabase

response = table.delete()

pprint.pprint(response)
