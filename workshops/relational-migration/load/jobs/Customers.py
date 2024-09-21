import string
import datetime
import random, math
random.seed(14)

def row_maker(tick):

    pk = str(tick).rjust(4, '0')

    phone = ''
    if random.randrange(1,3) == 2:
        phone = '800-' + str(random.randrange(100, 999)) + '-' + str(random.randrange(1000, 9999, 100))
    if tick % 5 == 0:
        phone = None

    state_id = random.randrange(0, len(states))
    region_id = math.floor(state_id / 2)

    row = {
        'cust_id': pk,
        'name': names[tick-1],
        'email': 'user1@' + str(random_string(4)) + '.com',
        'phone': phone,
        'region': regions[region_id],
        'state': states[state_id],
        'credit_rating': random.randrange(500, 800, 10),
        'last_updated': str(datetime.datetime.strptime(start_date, '%m/%d/%Y') + datetime.timedelta(days=-1*random.randrange(1, 365)))
    }

    return row


def job_info():
    job_params = {
        'db': 'mysql',
        'table': 'app_db.Customers',
        'row_count': 10,
    }
    return job_params

names = ['Zeus Transport', 'MaxiTaxi',  'Metro Motors', 'Drive Thru', 'Let it Ride', 'Fast Cars', 'Grab a Cab', 'Van Hailing', 'Shadowfax', 'Auto Seat']
start_date = '06/19/2024'
regions = ['East', 'West', 'North', 'South']
states = ['Massachusetts', 'New York', 'California', 'Washington', 'Minnesota', 'Wisconsin', 'Florida', 'Texas']

def random_string(length=8):
    letters = string.ascii_letters
    return ''.join(random.choice(letters) for i in range(length)).lower()
