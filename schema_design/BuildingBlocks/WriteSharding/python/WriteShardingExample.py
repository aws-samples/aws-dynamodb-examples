# Write sharding documentation: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-partition-key-sharding.html

from __future__ import print_function # Python 2/3 compatibility
import boto3, random, json

from boto3.dynamodb.conditions import Key

from botocore.exceptions import ClientError

dynamodb = boto3.resource('dynamodb', region_name='us-east-1')

table = dynamodb.Table('ExampleTable')

write_shard_count = 2

items = [
    {
        "date": "2021-01-01",
        "id": "1",
        "value": "1"
    },
    {
        "date": "2021-01-01",
        "id": "2",
        "value": "1"
    },
    {
        "date": "2021-01-01",
        "id": "1",
        "value": "1"
    },
    {
        "date": "2021-01-01",
        "id": "2",
        "value": "3"
    },
    {
        "date": "2021-01-01",
        "id": "1",
        "value": "3"
    }
]
#Write sharding with randomized suffix
for x in items:
    shard_id = random.randint(0, write_shard_count-1)
    pk = f'{x["date"]}.{str(shard_id)}'
    try:
        response = table.put_item(
        Item = {
                'pk': pk,
                'sk': x['id'],
                'value': x['value'],
            }
        )
    except ClientError as e:
        print(e.response['Error']['Message'])

#Read shards with randomized suffix
allItems = []

for x in range(write_shard_count):
    pk = "2021-01-01." + str(x)
    resp = table.query(KeyConditionExpression=Key('pk').eq(pk))
    allItems = allItems + resp['Items']

print("Data from table with randomized write shards")
for item in allItems:
    print(json.dumps(item, indent=4, sort_keys=True))

#Write shards with calculated suffix

orders = [
    {
        "date": "2021-02-01",
        "id": "123535",
        "value": "1"
    },
    {
        "date": "2021-02-01",
        "id": "345345",
        "value": "1"
    },
    {
        "date": "2021-02-01",
        "id": "123114",
        "value": "1"
    },
    {
        "date": "2021-02-01",
        "id": "234562",
        "value": "3"
    },
    {
        "date": "2021-02-01",
        "id": "346541",
        "value": "3"
    }
]

for x in orders:
    # Calculated suffix = % write shard count
    shard_id = int(x["id"]) % write_shard_count
    pk = f'{x["date"]}.{str(shard_id)}'
    try:
        response = table.put_item(
        Item = {
                'pk': pk,
                'sk': x['id'],
                'value': x['value'],
            }
        )
    except ClientError as e:
        print(e.response['Error']['Message'])

#Read 1 shard with a calculated suffix

shard_id = int(orders[0]["id"]) % write_shard_count
pk = "2021-02-01." + str(shard_id)
resp = table.query(KeyConditionExpression=Key('pk').eq(pk))
print("Data from table with calculated write shards")
print(json.dumps(resp['Items'], indent=4, sort_keys=True))