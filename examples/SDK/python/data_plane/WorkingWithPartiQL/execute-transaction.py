from __future__ import print_function # Python 2/3 compatibility
import boto3, json

from botocore.exceptions import ClientError

# Create low level client
session = boto3.session.Session()
client = session.client('dynamodb')

data = [
    {
        "pk": "1",
        "sk": "metadata"
    },
    {
        "pk": "2",
        "sk": "metadata"
    }
]
statements = []
for item in data:
    statement = {'Statement': "INSERT INTO ExampleTable VALUE {'pk':'%s','sk':'%s'}" % (item["pk"], item["sk"])}
    statements.append(statement)
try:
    response = client.execute_transaction(
        TransactStatements=statements
    )
    print(response)
except ClientError as e:
    print("ClientError")
    print(e.response['Error']['Message'])