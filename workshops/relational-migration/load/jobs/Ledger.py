import string
import datetime
import math
import random
random.seed(9)

def row_maker(tick):

    lines_per_customer = 10

    cust_id = ''
    event_id = ''

    cust_id = str(math.floor(((tick+3)/lines_per_customer))).rjust(4, '0')

    event_id = str(((tick+3)%lines_per_customer)+1).rjust(4, '0')

    prod_id = str(random.randrange(1, 13)).rjust(4, '0')

    datedelta = -1 * random.randrange(1, 365)
    event_date = str(datetime.datetime.strptime(start_date, '%m/%d/%Y') + datetime.timedelta(days=datedelta + 3))

    row = {
        'cust_id': str(ord_id),
        'event_id': ord_line_id,
        'event_date': event_date
        'account': '1000',
        'prod_id': prod_id,
        'credit': random.randrange(-50,100),
        'item_price': random.randrange(400, 7000, 100),

    }

    return row


start_date = '12/19/2024'


def job_info():
    job_params = {
        'db': 'mysql',
        'table': 'app_db.Ledger',
        'row_count': 200,
    }
    return job_params


def random_string(length=8):
    letters = string.ascii_letters
    return ''.join(random.choice(letters) for i in range(length)).lower()
