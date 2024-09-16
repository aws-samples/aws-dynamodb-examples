from __future__ import print_function # Python 2/3 compatibility
import boto3, pprint

dynamodb = boto3.resource('dynamodb', region_name='us-west-2') # substitute your preferred region

table = dynamodb.Table("Music") # Substitute your table name

#Add a region to an existing table. If streams is not already enabled, the enables it.
table.update(
        ReplicaUpdates=[
                {
                    'Create': {
                        'RegionName': 'us-east-2',
                    },
                }
        ]
)