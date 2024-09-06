import string
import datetime
import random
random.seed(11)

def row_maker(tick):

    pk = str(tick).rjust(4, '0')

    datedelta = -1 * random.randrange(1, 365)
    ord_date = str(datetime.datetime.strptime(start_date, '%m/%d/%Y') + datetime.timedelta(days=datedelta))
    ship_date = str(datetime.datetime.strptime(start_date, '%m/%d/%Y') + datetime.timedelta(days=datedelta + 2))
    last_updated = str(datetime.datetime.strptime(start_date, '%m/%d/%Y') + datetime.timedelta(days=datedelta + 3))

    row = {
        'ord_id': str(pk),
        'cust_id': str(random.randrange(1, 8)).rjust(4, '0'),
        'rep': random.choice(reps),
        'ord_date': ord_date,
        'ship_date': ship_date,
        'last_updated': last_updated
    }

    return row


start_date = '06/19/2024'
reps = ['SAM', 'PAT', 'ANA', 'LEA', 'BOB', 'ZOE']

def job_info():
    job_params = {
        'db': 'mysql',
        'table': 'app_db.Orders',
        'row_count': 10,
    }
    return job_params


def random_string(length=8):
    letters = string.ascii_letters
    return ''.join(random.choice(letters) for i in range(length)).lower()
