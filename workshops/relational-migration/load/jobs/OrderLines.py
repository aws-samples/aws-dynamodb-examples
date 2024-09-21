import string
import datetime
import math
import random
random.seed(9)

def row_maker(tick):

    lines_per_order = 4

    ord_id = str(math.floor(((tick+3)/lines_per_order))).rjust(4, '0')

    ord_line_id = str(((tick+3)%lines_per_order)+1).rjust(4, '0')

    prod_id = str(random.randrange(1, 13)).rjust(4, '0')

    datedelta = -1 * random.randrange(1, 365)
    last_updated = str(datetime.datetime.strptime(start_date, '%m/%d/%Y') + datetime.timedelta(days=datedelta + 3))

    row = {
        'ord_id': str(ord_id),
        'ord_line_id': ord_line_id,
        'prod_id': prod_id,
        'qty': random.randrange(1,10),
        'item_price': random.randrange(400, 7000, 100),
        'last_updated': last_updated
    }

    return row


start_date = '06/19/2024'


def job_info():
    job_params = {
        'db': 'mysql',
        'table': 'app_db.OrderLines',
        'row_count': 20,
    }
    return job_params


def random_string(length=8):
    letters = string.ascii_letters
    return ''.join(random.choice(letters) for i in range(length)).lower()
