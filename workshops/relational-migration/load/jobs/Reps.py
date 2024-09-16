import string
import datetime
import random
random.seed(10)

reps = ['SAM', 'PAT', 'ANA', 'LEA', 'BOB', 'ZOE']
lnames = ['DAVIS', 'SMITH', 'PATEL', 'LEE', 'ORTIZ', 'BROWN']

def row_maker(tick):

    start_date = '06/19/2024'
    datedelta = -1 * random.randrange(1, 365)
    last_updated = str(datetime.datetime.strptime(start_date, '%m/%d/%Y') + datetime.timedelta(days=datedelta + 3))

    row = {
        'rep_id': reps[tick-1],
        'rep_name': reps[tick-1] + ' ' + lnames[tick-1],
        'last_updated': last_updated
    }

    return row


def job_info():
    job_params = {
        'db': 'mysql',
        'table': 'app_db.Reps',
        'row_count': 6,
    }
    return job_params


def random_string(length=8):
    letters = string.ascii_letters
    return ''.join(random.choice(letters) for i in range(length)).lower()
