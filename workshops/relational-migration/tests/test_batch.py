import boto3
from botocore.config import Config
from botocore.exceptions import ClientError
import json

print('testing batch-write-item')

region = 'us-east-2'
table_name = 'Products'

ddb = boto3.resource('dynamodb', region_name=region)

items = {
    table_name: [
            { 'PutRequest': { 'Item': {'cust_id': 'c100', 'region': 'West', 'email': 'c100@me.com'} } },
            { 'PutRequest': { 'Item': {'cust_id': 'c101', 'region': 'East', 'email': 'c101@me.com'} } },
            { 'PutRequest': { 'Item': {'cust_id': 'c102', 'region': 'South', 'email': 'c102@me.com'} } },
            { 'PutRequest': { 'Item': {'cust_id': '', 'region': 'North', 'email': 'c103@me.com'} } }
    ]
}

response = ddb.batch_write_item(RequestItems=items)

print(json.dumps(response, indent=2))


