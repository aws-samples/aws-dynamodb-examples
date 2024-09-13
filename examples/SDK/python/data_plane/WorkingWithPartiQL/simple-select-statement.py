from __future__ import print_function # Python 2/3 compatibility
import boto3, json

from botocore.exceptions import ClientError

# Create low level client
session = boto3.session.Session()
client = session.client('dynamodb')

pk = "1"
sk = "metadata"

try:
    response = client.execute_statement(
        Statement= 'SELECT * FROM ExampleTable WHERE "pk" = ? AND "sk" = ?',
        Parameters= [{"S": pk}, {"S": sk}]
    )
except ClientError as e:
    print(e.response['Error']['Message'])
else:
    print("The PartiQL query returned the following items:")
    for item in response['Items']:
        print(json.dumps(item, indent=4, sort_keys=True))