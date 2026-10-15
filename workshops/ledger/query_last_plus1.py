import math, random, uuid
from datetime import datetime
import time
import boto3 
from boto3.dynamodb.conditions import Key, Attr
from botocore.config import Config 
from botocore.exceptions import ClientError 

target_table = 'journal'
desc = 'Sort Key: Query for latest and add 1'
records_to_load = 100

percent_chance_synthetic_collide = 10

sortkey_zero_padding = 6

def test_summary():
    tdesc = desc
    if percent_chance_synthetic_collide > 0:
        tdesc = desc + ', synthetic collisions: ' + str(percent_chance_synthetic_collide) + ' %'

    return {'test_desc': tdesc, 'target_table': target_table, 'records_to_load': records_to_load}


def query_last_sortkey(pkval, dynamodb, target_table):

    rcus = 0
    query_response = dynamodb.query(
        TableName=target_table,
        KeyConditionExpression='AccountID=:AccountID',
        ExpressionAttributeValues={':AccountID': {'S':pkval}},
        ScanIndexForward=False,  # Sort descending by sort key
        Limit=1,  # Return just the first item found
        ReturnConsumedCapacity='TOTAL',
        ConsistentRead=False
    )

    if len(query_response['Items']) == 0:
        last_sortkey = str(0).zfill(sortkey_zero_padding)
    else:
        last_sortkey = query_response['Items'][0]['Event']['S']

    rcus = query_response['ConsumedCapacity']['CapacityUnits']

    return {
            'last_sortkey':last_sortkey,
            'rcus': rcus
    }

def generate_item(request, second, dynamodb):
    target_table = 'journal'
    epoch_time = time.time()
    
    # nsnow = time.time_ns()
    # random.seed(nsnow)

    rand_static = random.Random(request)  
    rand_dynamic = random.Random() # default uses sys time
    # random.seed(request) 

    pk_count = 1
    collection_size = records_to_load

    pknum = (math.floor((request - 1) / collection_size)) + 1

    pkval = 'C1.B2.A' + str(pknum).zfill(3)
    # now = datetime.now()

    last_in_collection = query_last_sortkey(pkval, dynamodb, target_table)
    last_sortkey = last_in_collection['last_sortkey']
    rcus = last_in_collection['rcus']

    skval = str(int(last_sortkey) + 1).zfill(sortkey_zero_padding)

    if percent_chance_synthetic_collide > 0:
        nsnow = time.time_ns()
        # random.seed(nsnow)
        random_collider = rand_dynamic.randint(1, 100) % round(100/percent_chance_synthetic_collide)
        if random_collider == 0:
            # inject chaos, add same item in advance so the put will fail conditional check
            sneak_item_in(pkval, skval, dynamodb)
            # random.seed(request) 

    entity_values = {
        'cities': ['Atlanta', 'Boston', 'New York', 'New York', 'Philadelphia', 'Washington D.C.', 'Chicago', 'Phoenix', 'Miami', 'Portland', 'Tampa', 'Dallas', 'San Francisco', 'Los Angeles', 'Las Vegas', 'Las Vegas', 'Seattle'],
        'merchants': ['Zeus Transport', 'MaxiTaxi',  'Metro Motors', 'Drive Thru', 'Let it Ride', 'Fast Cars', 'Grab a Cab', 'Van Hailing', 'Shadowfax', 'Auto Seat']
    }

    charge_amount = 8 + (rand_static.randrange(1,30) - 15)
    if charge_amount == 0:
        charge_amount = 2

    if(request > (pk_count * collection_size)):
        return {}

    else:
        condition_expression = 'attribute_not_exists(Event)'

        item =  {
            'AccountID': {'S': pkval},
            'Event': {'S': skval},
            'City': {'S': rand_static.choice(entity_values['cities'])},
            'Merchant': {'S': rand_static.choice(entity_values['merchants'])},
            'Charged': {'S': str(charge_amount)}
        }

        request_body =  {
            'TableName': target_table,
            'ReturnConsumedCapacity': 'INDEXES',
            'Item' : item
        }

        if condition_expression:
            request_body['ConditionExpression'] = condition_expression

        return {
            'request_body': request_body,
            'rcus': rcus,
            'wcus': 0
        }

def sneak_item_in(pkval, skval, dynamodb):

    request_body =  {
        'TableName': target_table,
        'ReturnConsumedCapacity': 'INDEXES',
        'Item' : {
            'AccountID': {'S': pkval},
            'Event': {'S': skval},
            'City': {'S': 'Indianapolis'},
            'Merchant': {'S': '*** Raced In Writer'},
            'Charged': {'S': str(1)}            
        }
    }
    try:
        response = dynamodb.put_item(**request_body)
        return 'ok'
    except ClientError as ce:
        error_code = ce.response['Error']['Code']
        print(error_code)
   
