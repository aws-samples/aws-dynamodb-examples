# Implementation of application's DynamoDB database calls
import boto3
from boto3.dynamodb.types import TypeSerializer, TypeDeserializer
from botocore.config import Config
from botocore.exceptions import ClientError

import os
import time, datetime
import json

deserializer = boto3.dynamodb.types.TypeDeserializer()
serializer = boto3.dynamodb.types.TypeSerializer()

return_limit = 20
region = 'us-east-2'

ddb = boto3.client('dynamodb', region_name=region)
ddbr = boto3.resource('dynamodb', region_name=region)
# resource vs client: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/programming-with-python.html#programming-with-python-client-resource

serializer = TypeSerializer()
deserializer = TypeDeserializer()
table_metadata = {}


def engine():
    return "DynamoDB"


def list_tables():
    response = None
    table_names = []
    try:
        response = ddb.list_tables()
        # print('ddb list_tables response')
        base_tables = response['TableNames']
        for table in base_tables:
            table_names.append(table)

            response_dt = ddb.describe_table(TableName=table)
            table_metadata = json.loads(json.dumps(response_dt['Table'], default=serialize_datetime))

            if 'GlobalSecondaryIndexes' in table_metadata:
                gsis = table_metadata['GlobalSecondaryIndexes']
                for gsi in gsis:
                    table_names.append(table + '.' + gsi['IndexName'])

    except Exception as err:
        return {'Error': str(err)}

    return table_names


def desc_table(table):
    try:
        response = ddb.describe_table(TableName=table)
        response_str = json.dumps(response['Table'], default=serialize_datetime)

    except Exception as err:
        return {'Error': str(err)}

    # table_metadata[table] = json.loads(response_str)

    return response_str


def scan_table(table):
    response = None
    key_list = get_keys(table)

    try:
        response = ddb.scan(TableName=table)
    except Exception as err:
        return {'Error': str(err)}

    items = []

    ddb_items = response['Items']

    for item in ddb_items:
        new_item = deserialize_ddb(item) # convert DynamoDB JSON to plain JSON
        items.append(new_item)

    return items


def query(table, request):

    keyList = list(request['queryRequest']['queryConditions'].keys())
    sql_condition = keyList[0] + ' = %s'

    if len(keyList) > 1:
        sql_condition += ' AND ' + keyList[1] + ' = %s'

    key_vals = list(request['queryRequest']['queryConditions'].values())

    query_stmt = 'SELECT * FROM ' + table + ' WHERE ' + sql_condition


#     mysql_cur.execute(query_stmt, key_vals)
#     result = mysql_cur.fetchall()
#     dataset = format_sql_dataset(result)

    return dataset


def get_record(table, request):
    get_request = {'TableName': table}
    keyList = list(request['Key'].keys())
    pk_name = keyList[0]
    pk_value = request['Key'][keyList[0]]
    sk_name = None
    sk_value = None
    if len(keyList) > 1:
        sk_name = keyList[1]
        sk_value = request['Key'][keyList[1]]

    response = None
    key_list = get_keys(table)
    get_request['Key'] = request['Key']

    try:
        table = ddbr.Table(table)
        response = table.get_item(**get_request)
        # print('response: ')
        # print(response['Item'])

        return response['Item']
    except Exception as err:
        return {'Error': str(err)}

    items = []

#     ddb_items = response['Items']
#     print(ddb_items)

    return response['Item']


def new_record(table, record):

    return({"status":1})


def update_record(table, request):

    return({"status": 1})


def delete_record(table, recordKey):

    return({"status":1})


def serialize_datetime(obj):
    if isinstance(obj, datetime.datetime):
        formatted = obj.isoformat()
        return formatted[:19].replace('T', ' ')
    raise TypeError("Type not serializable")

def deserialize_ddb(dynamodb_json_string):
    return deserializer.deserialize({'M': dynamodb_json_string})

def get_keys(table):
    key_list = []
    if table not in table_metadata:
        try:
            response = ddb.describe_table(TableName=table)
            response_str = json.dumps(response['Table'], default=serialize_datetime)

        except Exception as err:
            return {'Error': str(err)}

        table_metadata[table] = json.loads(response_str)

    key_schema = table_metadata[table]['KeySchema']

    hash_key = [key for key in key_schema if key['KeyType'] == 'HASH']
    range_key = [key for key in key_schema if key['KeyType'] == 'RANGE']

    key_list.append(hash_key[0]['AttributeName'])
    if range_key:
        key_list.append(range_key[0]['AttributeName'])

    return key_list


def dynamo_to_python(dynamo_object: dict) -> dict:
    deserializer = TypeDeserializer()
    return {
        k: deserializer.deserialize(v)
        for k, v in dynamo_object.items()
    }

def python_to_dynamo(python_object: dict) -> dict:
    serializer = TypeSerializer()
    return {
        k: serializer.serialize(v)
        for k, v in python_object.items()
    }