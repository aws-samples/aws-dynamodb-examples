import boto3, json
from boto3.dynamodb.conditions import Key

# boto3 is the AWS SDK library for Python.
# The "resources" interface allows for a higher-level abstraction than the low-level client interface.
# For more details, go to http://boto3.readthedocs.io/en/latest/guide/resources.html
dynamodb = boto3.resource('dynamodb', region_name='us-west-2')
table = dynamodb.Table('RetailDatabase')

# When making a Query API call, we use the KeyConditionExpression parameter to specify the partition key on which we want to query.
# We're using the Key object from the Boto3 library to specify that we want the attribute name ("pk")
# to equal "helga.ramirez@somewhere.com" by using the ".eq()" method.
resp = table.query(KeyConditionExpression=Key('pk').eq('helga.ramirez@somewhere.com'))

print("The query returned the following items:")
for item in resp['Items']:
    print(json.dumps(item, indent=4, sort_keys=True))
