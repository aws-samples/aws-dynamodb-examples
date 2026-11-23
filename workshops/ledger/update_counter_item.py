import math, random, uuid, os
from datetime import datetime
import time
import boto3 
import sys
from boto3.dynamodb.conditions import Key, Attr
from botocore.config import Config 
from botocore.exceptions import ClientError 
from payload import payload_text_fixed, payload_text_anysize

target_table = os.getenv("TARGET_TABLE", "journal")
target_table2 = os.getenv("TARGET_TABLE2", "counter")

desc = os.getenv("TEST_DESC", 'Sort Key: Update counter item +1')

records_to_load = 300


sortkey_zero_padding = 6

def test_summary():
    tdesc = desc

    return {'test_desc': tdesc, 'target_table': target_table, 'records_to_load': records_to_load}


def generate_new_sortkey_value(pkval, dynamodb):

    rcus = 0
    wcus = 0

    key = {
        'AccountID': {'S': pkval},
        'SK': {'S': '0'}
    }

    update_response = dynamodb.update_item(
        TableName=target_table2,
        Key=key,
        UpdateExpression="ADD #attr :val",
        ExpressionAttributeNames={'#attr': 'counter'},
        ExpressionAttributeValues={':val': {'N': '1'}},
        ReturnValues='UPDATED_NEW',
        ReturnConsumedCapacity='TOTAL'
    )

    new_value = update_response['Attributes']['counter']['N']

    wcus = update_response['ConsumedCapacity']['CapacityUnits']

    return {
            'next_counter':new_value,
            'rcus': 0,
            'wcus': wcus
    }

def generate_item(request, second, dynamodb):

    pk_count = 1
    collection_size = records_to_load

    if(request > (pk_count * collection_size)):
        return {}

    else:

        epoch_time = time.time()
        
        # nsnow = time.time_ns()
        # random.seed(nsnow)

        rand_static = random.Random(request)  
        rand_dynamic = random.Random() # default uses sys time
        # random.seed(request) 

        pknum = (math.floor((request - 1) / collection_size)) + 1

        pkval = 'C1.B2.A' + str(pknum).zfill(3)
        # now = datetime.now()

        next_result = generate_new_sortkey_value(pkval, dynamodb)

        last_sortkey = next_result['next_counter']
        wcus = next_result['wcus']

        skval = str(int(next_result['next_counter'])).zfill(sortkey_zero_padding)

        entity_values = {
            'cities': ['Atlanta', 'Boston', 'New York', 'New York', 'Philadelphia', 'Washington D.C.', 'Chicago', 'Phoenix', 'Miami', 'Portland', 'Tampa', 'Dallas', 'San Francisco', 'Los Angeles', 'Las Vegas', 'Las Vegas', 'Seattle'],
            'merchants': ['Zeus Transport', 'MaxiTaxi',  'Metro Motors', 'Drive Thru', 'Let it Ride', 'Fast Cars', 'Grab a Cab', 'Van Hailing', 'Shadowfax', 'Auto Seat']
        }

        charge_amount = 8 + (rand_static.randrange(1,30) - 15)
        if charge_amount == 0:
            charge_amount = 2


        condition_expression = 'attribute_not_exists(Event)'

        item =  {
            'AccountID': {'S': pkval},
            'Event': {'S': skval},
            'City': {'S': rand_static.choice(entity_values['cities'])},
            'Merchant': {'S': rand_static.choice(entity_values['merchants'])},
            'Charged': {'S': str(charge_amount)},
            'Payload': {'S': payload_text_fixed()}
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
            'rcus': 0,
            'wcus': wcus
        }


   
