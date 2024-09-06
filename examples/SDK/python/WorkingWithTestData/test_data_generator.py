from logging import error
import os
import boto3
import hashlib
from botocore.exceptions import ClientError


dynamodb = boto3.resource('dynamodb', region_name='us-east-1')

# make sure Music or your custom table exists and change attributes and primary key accordingly
table = dynamodb.Table('Music')
# table schema Music table, string artist (PKHash), string title (PK-Sort), string attribute (string attribute)

#each item will be approx. 20kb hence set counter limit accordingly
counter = 0
COUNTER_LIMIT = 12

while True:
    print("\n loop " + str(counter) + "\n")
    pk_str = "batman" + str(counter)
    pk_hash = hashlib.md5(pk_str.encode()).hexdigest()
    pk_sort_str = "happy" + str(counter)
    pk_sort_hash = hashlib.md5(pk_sort_str.encode()).hexdigest()
    attribute = os.urandom(10240).hex()
    try:
        response = table.put_item(
            Item={
                'artist': pk_hash,
                'title': pk_sort_hash,
                'album': attribute
            })
    except ClientError as error:
        print('Error happened')

    counter += 1
    if counter > COUNTER_LIMIT:
        print("We have added {} item each nearly 20kb".format(COUNTER_LIMIT))
        break
