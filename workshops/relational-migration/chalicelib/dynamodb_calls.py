# Implementation of application's DynamoDB database calls
import boto3
from boto3.dynamodb.types import TypeSerializer, TypeDeserializer
from botocore.config import Config
from botocore.exceptions import ClientError

import os
import time, datetime
import json
from decimal import Decimal

deserializer = boto3.dynamodb.types.TypeDeserializer()
serializer = boto3.dynamodb.types.TypeSerializer()

return_limit = 20
region = os.getenv('AWS_DEFAULT_REGION','us-west-2')

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

#             if 'GlobalSecondaryIndexes' in table_metadata:
#                 gsis = table_metadata['GlobalSecondaryIndexes']
#                 for gsi in gsis:
#                     table_names.append(table + '.' + gsi['IndexName'])

    except Exception as err:
        return {'Error': str(err)}

    return {'Tables': table_names}


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
    # print(request)
    query_request = {
        'TableName': table,
        'ScanIndexForward': True
    }
    if request['queryRequest']['index'] and request['queryRequest']['index'] != 'PRIMARY':
        query_request['IndexName'] = request['queryRequest']['index']

    key_list = list(request['queryRequest']['queryConditions'].keys())
    key_vals = list(request['queryRequest']['queryConditions'].values())
    key_conditions = ''
    expression_attribute_names = {}
    expression_attribute_values = {}

    for i, attr_name in enumerate(key_list):
        attr_val = key_vals[i]
        if attr_val[0] in ['<', '>']:
            key_conditions += "#K" + str(i) + ' ' +  attr_val[0] + ' :V' + str(i) + ' and '
            expression_attribute_values[':V' + str(i)] = {'S': attr_val[1:]}
        else:
            if attr_val[-1] == '*':
                key_conditions += "begins_with(#K" + str(i) + ', :V' + str(i) + ') and '
                expression_attribute_values[':V' + str(i)] = {'S': attr_val[:-1]}

            else:
                key_conditions += "#K" + str(i) + ' = :V' + str(i) + ' and '
                expression_attribute_values[':V' + str(i)] = {'S': attr_val}

        expression_attribute_names["#K" + str(i)] = attr_name

    query_request['KeyConditionExpression'] = key_conditions[:-5]
    query_request['ExpressionAttributeNames'] = expression_attribute_names
    query_request['ExpressionAttributeValues'] = expression_attribute_values

    print(json.dumps(query_request, indent=2))

    response = None

    try:
#         table = ddb.Table(table)
        response = ddb.query(**query_request)

    except Exception as err:
        return {'Error': json.dumps(err, indent=2)}

    ddb_items = response['Items']
    items = []

    for item in ddb_items:
        new_item = deserialize_ddb(item) # convert DynamoDB JSON to plain JSON
        items.append(new_item)

    return items
    # return response['Items']


def get_record(table, request):
    get_request = {'TableName': table}

    get_request['ConsistentRead'] = False

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
        if 'Item' in response:

            return [response['Item']]
        else:
            return []

    except Exception as err:
        return {'Error': json.dumps(err, indent=2)}

    items = []

#     ddb_items = response['Items']
#     print(ddb_items)

    return []


def new_record(table, record):
    try:
        table = ddbr.Table(table)
        request = {
            "Item": record
        }
        response = table.put_item(**request)

    except Exception as err:
        return {'Error': json.dumps(err, indent=2)}

    return({"status":1})


def update_record(table, request):
    update_request = {}
    update_request['Key'] = request['Key']
    attrs = request['updateAttributes']
    update_expression = 'set '
    attr_names = {}
    attr_values = {}

    for i, attrName in enumerate(attrs.keys()):
        update_expression += '#K' + str(i) + ' = :V' + str(i) + ', '
        attr_names['#K' + str(i)] = attrName
        val = None
        if isinstance(attrs[attrName], float):
            val = Decimal(str(attrs[attrName]))
        else:
            val = attrs[attrName]

        attr_values[':V' + str(i)] = val

    update_expression = update_expression[:-2]

    update_request['UpdateExpression'] = update_expression
    update_request['ExpressionAttributeNames'] = attr_names
    update_request['ExpressionAttributeValues'] = attr_values

    try:
        table = ddbr.Table(table)
        response = table.update_item(**update_request)

    except Exception as err:

        return {'Error': json.dumps(err, indent=2)}

    return {"status": 1}


def delete_record(table, request):
    # request['ReturnConsumedCapacity'] = 'TOTAL'
    request['ReturnValues'] = 'ALL_OLD'
    delete_count = 0

    try:
        table = ddbr.Table(table)
        response = table.delete_item(**request)
        if 'Attributes' in response:
            delete_count = 1

    except Exception as err:
        return {'Error': json.dumps(err, indent=2)}

    return({"status":delete_count})


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


def is_number(s):
    try:
        float(s)
        return True
    except ValueError:
        return False