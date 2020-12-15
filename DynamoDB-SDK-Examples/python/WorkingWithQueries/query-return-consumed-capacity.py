from __future__ import print_function  # Python 2/3 compatibility
import boto3
import json
import decimal
from boto3.dynamodb.conditions import Key, Attr
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
        ExpressionAttributeNames={
            '#pk': 'Artist',
        },
        ExpressionAttributeValues={
            ':pk': 'Michael Jackson',
        },
        KeyConditionExpression='#pk = :pk',
        ReturnConsumedCapacity='TOTAL'
    )
except ClientError as e:
    print(e.response['Error']['Message'])
else:
    print('Consumed capacity for for this query:', json.dumps(
        response['ConsumedCapacity'], indent=4, cls=DecimalEncoder))

    if 'LastEvaluatedKey' in response:
        print('Not all items have been retrieved by this query. At least one another request is required to get all available items. The last evaluated key corresponds to',
              json.dumps(response['LastEvaluatedKey'], indent=4, cls=DecimalEncoder))

    print('Query response:', json.dumps(response, indent=4, cls=DecimalEncoder))
