import math, random, os
from datetime import datetime, timedelta, date
import time
import boto3 
from boto3.dynamodb.conditions import Key, Attr
from botocore.config import Config 
from botocore.exceptions import ClientError 
from payload import payload_text_fixed, payload_text_anysize

target_table = os.getenv("TARGET_TABLE", "journal-indexed")

desc = os.getenv("TEST_DESC", 'Sort Key: Query last plus 1, spendlimit')

records_to_load = 50

percent_chance_synthetic_collide = 0

sortkey_zero_padding = 6

startdate = datetime(2026, 11, 1, 2)


def test_summary():
    tdesc = desc
    if percent_chance_synthetic_collide > 0:
        tdesc = desc + '. Synthetic collision chance: ' + str(percent_chance_synthetic_collide) + ' %'

    return {'test_desc': tdesc, 'target_table': target_table, 'records_to_load': records_to_load}


def query_last_sortkey(pkval, dynamodb, target_table): # query for last sortkey in collection
    spendlimit = 0
    spendcurrent = 0
    last_sortkey = None

    rcus = 0
    query_response = dynamodb.query(
        TableName=target_table,
        KeyConditionExpression='AccountID=:AccountID',
        ExpressionAttributeValues={':AccountID': {'S':pkval}},
        ScanIndexForward=False,  # Sort descending by sort key
        Limit=2,  # Return the first two: AccountPrimary plus latest journal
        ReturnConsumedCapacity='TOTAL',
        ConsistentRead=False
    )

    if len(query_response['Items']) == 0:
        print('error: please add an AccountPrimary record for ' + pkval + ' with the spendlimit set')
        exit(1)
    else: 
        spendlimit = query_response['Items'][0].get('spendlimit').get('N')

        if len(query_response['Items']) == 1:    
            last_sortkey = str(0).zfill(sortkey_zero_padding)
        else:
            last_sortkey = query_response['Items'][1]['Event']['S']
            spendcurrent = query_response['Items'][1].get('spendcurrent', 0).get('N')

    rcus = query_response['ConsumedCapacity']['CapacityUnits']

    return {
            'last_sortkey':last_sortkey,
            'rcus': rcus,
            'wcus': 0,
            'spendlimit': spendlimit,
            'spendcurrent': spendcurrent
    }

def generate_item(request, second, dynamodb):

    epoch_time = time.time()
    denyreason = ''
    
    # nsnow = time.time_ns()
    # random.seed(nsnow)

    rand_static = random.Random(request+5)  
    rand_dynamic = random.Random() # default uses sys time
    # random.seed(request) 

    pk_count = 1
    collection_size = records_to_load

    if(request > (pk_count * collection_size)):
        return {}

    pknum = (math.floor((request - 1) / collection_size)) + 1

    pkval = 'C1.B2.A' + str(pknum).zfill(3)
    # now = datetime.now()

    last_in_collection = query_last_sortkey(pkval, dynamodb, target_table)
    last_sortkey = last_in_collection['last_sortkey']
    rcus = last_in_collection['rcus']

    spendlimit = int(last_in_collection.get('spendlimit', 0))
    spendcurrent = int(last_in_collection.get('spendcurrent', 0))

    # if not isinstance(last_sortkey.lstrip('0') or '0', int):
    #     last_sortkey = 0 # allow sequence to begin following non-integer items
    new_sortkey_int = None

    try:
        new_sortkey_int = int(last_sortkey) + 1
    except ValueError:
        new_sortkey_int = 0

    skval = str(new_sortkey_int).zfill(sortkey_zero_padding)


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

    condition_expression = 'attribute_not_exists(Event)'

    if spendcurrent + charge_amount > spendlimit:
        denyreason = 'Alert: The charge for: $' + str(charge_amount) + ' was denied. Current account balance: $' + str(spendcurrent) + ', account limit: $' + str(spendlimit)

    itemdate = startdate + timedelta(hours=(6*(request-1)))

    city = rand_static.choice(entity_values['cities'])
    merchant = rand_static.choice(entity_values['merchants'])
    dateday = str(itemdate.date())                          

    item =  {
        'AccountID': {'S': pkval},
        'Event': {'S': skval},
        'City': {'S': city},
        'Merchant': {'S': merchant},
        'Charged': {'S': str(charge_amount)},
        'spendcurrent': {'N': str(spendcurrent + charge_amount)},
        'Datetime': {'S': str(itemdate)},
        'Payload': {'S': payload_text_anysize(0.012)}
    }

    # item[city] = {'S': city}
    # item[merchant] ={'S': merchant}
    item[dateday] = {'S': dateday}

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
        'wcus': 0,
        'denyreason': denyreason
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
   
