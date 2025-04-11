import string
import random
from datetime import datetime
from datetime import timedelta
random.seed(9)

def row_maker(tick):

    pk = str(tick).rjust(4, '0')

    date_default = datetime(2025, 1, 1)
    date_offset = random.randrange(0, 100) - 50
    event_date = date_default + timedelta(days=date_offset)

    row = {
        'prod_id': pk,
        'name': products[tick-1],
        'category': categories[tick-1],
        'list_price': random.randrange(500, 8000, 100)-1,
        'last_updated': event_date.isoformat()
    }

    return row


def job_info():
    job_params = {
        'db': 'mysql',
        'table': 'app_db.Products',
        'row_count': 14,
    }
    return job_params

categories = ['Street', 'Street', 'Street', 'Street', 'Street', 'Street', 'Street', 'Snow', 'Snow', 'Air', 'Air', 'Sea', 'Lake', 'Lake', 'Sea']

products = ['Bicycle', 'Car', 'Truck', 'Motorcycle', 'Moped', 'Scooter', 'Skateboard', 'Snowboard', 'Sled', 'Helicopter', 'Drone', 'Jet Ski', 'Kayak', 'Canoe', 'Motor Boat']

def random_string(length=8):
    letters = string.ascii_letters
    return ''.join(random.choice(letters) for i in range(length))