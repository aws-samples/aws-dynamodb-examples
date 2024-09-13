from __future__ import print_function  # Python 2/3 compatibility
import boto3
import json
import decimal
from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError


# Helper class to convert a DynamoDB item to JSON.
class DecimalEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, decimal.Decimal):
            return str(o)
        return super(DecimalEncoder, self).default(o)


dynamodb = boto3.resource('dynamodb', region_name='us-west-2')

table = dynamodb.Table('Music')

try:
    response = table.query(
        KeyConditionExpression=Key('Artist').eq('Michael Jackson'),
        ProjectionExpression='SongTitle, Album'
    )
except ClientError as e:
    print(e.response['Error']['Message'])
else:
    print('Query response:', json.dumps(response, indent=4, cls=DecimalEncoder))
