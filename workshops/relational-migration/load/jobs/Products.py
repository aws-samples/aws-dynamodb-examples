import string
import random
random.seed(9)

def row_maker(tick):

    pk = str(tick).rjust(4, '0')

    row = {
        'prod_id': pk,
        'name': products[tick-1],
        'category': categories[tick-1],
        'list_price': random.randrange(500, 8000, 100)-1,
        'last_updated': '2024-06-02'
    }

    return row


def job_info():
    job_params = {
        'db': 'mysql',
        'table': 'app_db.Products',
        'row_count': 12,
    }
    return job_params

categories = ['Street', 'Street', 'Street', 'Street', 'Street', 'Street', 'Street', 'Snow', 'Air', 'Sea', 'Lake', 'Lake']
products = ['Bicycle', 'Car', 'Truck', 'Motorcycle', 'Moped', 'Scooter', 'Skateboard', 'Snowboard', 'Helicopter', 'Jet Ski', 'Kayak', 'Canoe']

def random_string(length=8):
    letters = string.ascii_letters
    return ''.join(random.choice(letters) for i in range(length))