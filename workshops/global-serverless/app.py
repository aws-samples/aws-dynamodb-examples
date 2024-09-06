import os
import time
from chalice import Chalice
import boto3
from botocore.exceptions import ClientError

app = Chalice(app_name='global-serverless')
dynamodb_table_name = 'global-serverless'

demo_item_pk = 'user100'
demo_item_sk = 'AshlandValley'

region = None

if "AWS_DEFAULT_REGION" in os.environ:
    region = os.environ['AWS_DEFAULT_REGION']
else:
    region = "us-west-2"

ddb = boto3.client('dynamodb', region_name=region)


@app.route('/', methods=['GET'], cors=True)
def ping():
    return {'ping': 'ok'}


@app.route('/scan', methods=['GET'], cors=True)
def scan():
    params = {"TableName": dynamodb_table_name}
    response = None
    tic = time.perf_counter()

    try:
        response = ddb.scan(**params)
    except Exception as err:
        return {'Error': str(err)}

    toc = time.perf_counter()
    lambda_latency = round((toc - tic) * 1000)

    return {'Items': response['Items'], 'Latency': lambda_latency}


@app.route('/query/{PK}', methods=['GET'], cors=True)
def query(PK):
    params = {"TableName": dynamodb_table_name,
              "KeyConditionExpression": "#ean = :eav",
              "ExpressionAttributeNames": {"#ean": "PK"},
              "ExpressionAttributeValues": {":eav": {"S": PK}}}

    tic = time.perf_counter()
    try:
        response = ddb.query(**params)
    except Exception as err:
        return {'Error': str(err)}

    toc = time.perf_counter()
    lambda_latency = round((toc - tic) * 1000)

    return {'Items': response['Items'], 'Latency': lambda_latency}


@app.route('/get/{PK}/{SK}', methods=['GET'], cors=True)
def get(PK, SK):
    params = {"TableName": dynamodb_table_name,
              "Key": {"PK": {"S": PK},
                      "SK": {"S": SK}}
              }
    tic = time.perf_counter()
    try:
        response = ddb.get_item(**params)
    except Exception as err:
        return {'Error': str(err)}

    toc = time.perf_counter()
    lambda_latency = round((toc - tic) * 1000)

    item = None
    if 'Item' in response.keys():
        item = response['Item']

    return {'Item': item, 'Latency': lambda_latency}


@app.route('/update/{PK}/{SK}/{VAL}', methods=['GET'], cors=True)
def update(PK, SK, VAL):

    params = {"TableName": dynamodb_table_name,
              "Key": {"PK": {"S": PK},
                      "SK": {"S": SK}
                      },
              "ReturnValues": 'UPDATED_NEW',
              "UpdateExpression": 'SET Bookmark = Bookmark + :inc',
              "ExpressionAttributeValues": {":inc": {"N": str(VAL)}}
              }

    tic = time.perf_counter()

    try:
        response = ddb.update_item(**params)
    except Exception as err:
        return {'Error': str(err)}

    toc = time.perf_counter()
    lambda_latency = round((toc - tic) * 1000)

    if 'Item' in response.keys():
        item = response['Item']
        return {'Item': item, 'Latency': lambda_latency}
    else:
        if 'Attributes' in response.keys() and 'Bookmark' in response['Attributes']:
            response['PK'] = PK
            response['SK'] = SK
            response['Latency'] = lambda_latency
            return response

@app.route('/update/{PK}/{SK}/{VAL}/{THUMB}', methods=['GET'], cors=True)
def update(PK, SK, VAL, THUMB):

    params = {"TableName": dynamodb_table_name,
              "Key": {"PK": {"S": PK},
                      "SK": {"S": SK}
                      },
              "ReturnValues": 'UPDATED_NEW',
              "UpdateExpression": 'SET bookmark = :b, thumb = :t',
              "ExpressionAttributeValues": {":b": {"S": str(VAL)}, ":t": {"S": str(THUMB)}}
              }

    tic = time.perf_counter()

    try:
        response = ddb.update_item(**params)
    except Exception as err:
        return {'Error': str(err)}

    toc = time.perf_counter()
    lambda_latency = round((toc - tic) * 1000)

    if 'Item' in response.keys():
        item = response['Item']
        return {'Item': item, 'Latency': lambda_latency}
    else:
        if 'Attributes' in response.keys() and 'bookmark' in response['Attributes']:
            response['PK'] = PK
            response['SK'] = SK
            response['Latency'] = lambda_latency
            return response


def create_dynamodb_client(region="us-west-2"):
    return boto3.client("dynamodb", region_name=region)


#
# def execute_scan(dynamodb_client, table_name):
#     try:
#
#         print("Scan successful.")
#         print(response)
#     except ClientError as error:
#         print(error)
#     except BaseException as error:
#         print("Unknown error while scanning: " + error.response['Error']['Message'])


# The view function above will return {"hello": "world"}
# whenever you make an HTTP GET request to '/'.
#
# Here are a few more examples:
#
# @app.route('/hello/{name}')
# def hello_name(name):
#    # '/hello/james' -> {"hello": "james"}
#    return {'hello': name}
#
# @app.route('/users', methods=['POST'])
# def create_user():
#     # This is the JSON body the user sent in their POST request.
#     user_as_json = app.current_request.json_body
#     # We'll echo the json body back to the user in a 'user' key.
#     return {'user': user_as_json}
#
# See the README documentation for more examples.
#
