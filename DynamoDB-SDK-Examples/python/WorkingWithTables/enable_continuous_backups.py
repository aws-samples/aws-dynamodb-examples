
from __future__ import print_function  # Python 2/3 compatibility
import boto3, pprint

dynamodb = boto3.resource('dynamodb', region_name='us-west-2')

table = dynamodb.Table("Music") # Substitute your table name

response = table.meta.client.update_continuous_backups(
    TableName='RetailDatabase',
    PointInTimeRecoverySpecification={
        'PointInTimeRecoveryEnabled': True # options are True|False
    }
)

# Print the JSON response
pprint.pprint(response)
