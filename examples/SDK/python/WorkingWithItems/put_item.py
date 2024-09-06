from __future__ import print_function # Python 2/3 compatibility
import boto3, json, decimal

from botocore.exceptions import ClientError

# Helper class to convert a DynamoDB item to JSON.
class DecimalEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, decimal.Decimal):
            if abs(o) % 1 > 0:
                return float(o)
            else:
                return int(o)
        return super(DecimalEncoder, self).default(o)

dynamodb = boto3.resource('dynamodb', region_name='us-west-2')

table = dynamodb.Table('RetailDatabase')

#Insert new user data into the system
try:
    response = table.put_item(
       Item={
            'pk': "jim.bob@somewhere.com",
            'sk': "metadata",
            'name': "Jim Bob",
            'first_name': "Jim",
            'last_name': "Bob",
            'address': {
                'road': "456 Nowhere Lane",
                'city': "Langely",
                'state': "WA",
                'pcode': "98260",
                'country': "USA"
            },
            'username': "jbob"
        }
    )
except ClientError as e:
    print(e.response['Error']['Message'])
else:
    print("PutItem succeeded:")
    print(json.dumps(response, indent=4, cls=DecimalEncoder))