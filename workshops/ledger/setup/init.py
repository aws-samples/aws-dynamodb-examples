import math
import random

random.seed(100) 

cities = ['Boston', 'New York', 'New York', 'New York', 'New York', 'Philadelphia', 'Washington D.C.', 'Washington D.C.']
statuses = ['QUOTED', 'ORDERED', 'PICKED', 'PACKED', 'SHIPPED', 'DELIVERED', 'RETURNED', None, None, None]
products = ['Car', 'Car', 'Car', 'Truck', 'Truck', 'Bike']
premiums = ['Bronze', 'Bronze', 'Bronze', 'Silver', 'Silver', 'Gold', None, None, None, None, None, None, None, None, None, None, None, None, None, None, None, None, None, None, None, None, None]
dates = [-150, -80, -60, -20, -10, 2, 1, 0, 0, 2, 10, 20, 60, 80, 150]


def generate_item(request, second):
    target_table = 'ecommerce'

    pk_count = 2
    collection_size = 3

    pkval = 'user-' + str((math.floor((request - 1) / collection_size)) + 1)
    skval = 'event-' + str(((request -1) % collection_size) + 1)

    if(request > (pk_count * collection_size)):
        return {}
    else:
        # city = 'Stoneham'
        city = random.choice(cities)
        
        return {
            'TableName': target_table,
            'ReturnConsumedCapacity': 'TOTAL',
            'Item' : {
                'PK': {'S': pkval},
                'SK': {'S': skval},
                'Request': {'N': str(request)},
                'Second': {'N': str(second)},
                'City': {'S': city},
                'Payload': {'S': util.payload_data(0.1)}
            }

        }


def random_string(length=8):
    letters = string.ascii_letters
    return ''.join(random.choice(letters) for i in range(length))

