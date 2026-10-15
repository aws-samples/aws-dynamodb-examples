import math, random
from datetime import datetime

target_table = 'journal'
desc = 'Sort Key: Current Datetime'
records_to_load = 100

def test_summary():
    return {'test_desc': desc, 'target_table': target_table, 'records_to_load': records_to_load}


def generate_item(request, second, dynamodb):
    target_table = 'journal'

    pk_count = 1
    collection_size = records_to_load

    pknum = (math.floor((request - 1) / collection_size)) + 1
    sknum = ((request -1) % collection_size) + 1

    pkval = 'C1.B2.A' + str(pknum).zfill(3)
    now_iso = datetime.now().isoformat()
    skval = now_iso

    random.seed(request + 25) 

    entity_values = {
        'cities': ['Atlanta', 'Boston', 'New York', 'New York', 'Philadelphia', 'Washington D.C.', 'Chicago', 'Phoenix', 'Miami', 'Portland', 'Tampa', 'Dallas', 'San Francisco', 'Los Angeles', 'Las Vegas', 'Las Vegas', 'Seattle'],
        'merchants': ['Zeus Transport', 'MaxiTaxi',  'Metro Motors', 'Drive Thru', 'Let it Ride', 'Fast Cars', 'Grab a Cab', 'Van Hailing', 'Shadowfax', 'Auto Seat']
    }
    amount = 8 + (random.randrange(1,30) - 15)
    if amount == 0:
        amount = 2

    if(request > (pk_count * collection_size)):
        return {}

    else:
        condition_expression = 'attribute_not_exists(Event)'

        item = {
            'AccountID': {'S': pkval},
            'Event': {'S': skval},
            'City': {'S': random.choice(entity_values['cities'])},
            'Merchant': {'S': random.choice(entity_values['merchants'])},
            'Charged': {'S': str(amount)}
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
            'wcus': 0
        }

