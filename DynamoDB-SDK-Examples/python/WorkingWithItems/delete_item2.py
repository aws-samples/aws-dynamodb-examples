# Normally if you just delete an item and that item does not exists, a delete successful message is still returned.
# What if you want an error to be thrown?
# Theisexample will delete an item using a conditional delete, but return an error if the item does not exist.
# It just looks for the existence of the item with this primary key, but that those attributes exist. If the item does
# exist, it is deleted. If it does not exist, you get "The conditional request failed".


from __future__ import print_function  # Python 2/3 compatibility
import boto3, json
from botocore.exceptions import ClientError


dynamodb = boto3.resource('dynamodb', region_name='us-west-2')

table = dynamodb.Table('RetailDatabase')


try:
    response = table.delete_item(
        Key={
            'pk': "jim.bob",
            "sk": "metadata"
        },
        ConditionExpression="attribute_exists (pk) AND attribute_exists (sk)",
    )
except ClientError as e:
    if e.response['Error']['Code'] == "ConditionalCheckFailedException":
        print(e.response['Error']['Message'])
    else:
        raise
else:
    print("DeleteItem succeeded:")
    print(json.dumps(response, indent=4, sort_keys=True))