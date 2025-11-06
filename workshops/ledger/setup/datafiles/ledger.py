import math
import random
import util
from datetime import datetime, date, timedelta
import pprint
import uuid

start_date = datetime(2025, 11, 20)

add_super_sparse = False

entity_columns = ['AccountID', 'Event', 'Timestamp', 'Amount', 'Merchant', 'City']

cities = ['Boston', 'New York', 'New York', 'Philadelphia', 'Washington D.C.', 'Atlanta', 'Chicago', 'Phoenix', 'Miami', 'Portland', 'Tampa', 'Dallas', 'San Francisco', 'Los Angeles', 'Las Vegas', 'Seattle']
merchants = ['Zeus Transport', 'MaxiTaxi',  'Metro Motors', 'Drive Thru', 'Let it Ride', 'Fast Cars', 'Grab a Cab', 'Van Hailing', 'Shadowfax', 'Auto Seat']

date_values = []

for d in range(0,5):
    date_values.append(str(start_date + timedelta(days=d))[:10])

if add_super_sparse:
    entity_columns.extend(cities)
    entity_columns.extend(merchants)
    entity_columns.extend(date_values)

companies = 1
banks = 2
accounts = 3
days = 3
events_per_day = 5
max_rows = accounts * days * events_per_day

random.seed(345) 


date_offsets = [0,1,2]
hours = [2, 3, 5, 7, 9, 12, 15, 16, 19, 20, 22]
minutes = [0, 0, 1, 3, 4, 6, 10, 17, 20, 25, 29, 33, 34, 42, 48, 55]
seconds = [1, 3, 4, 6, 10, 17, 20, 25, 29, 33, 34, 42, 48, 55]

acct_list = []
accts = {}
event_list = []

for ae in range(1,max_rows+1):
    issuer = 'C1'
    division = 'B' + str(random.randrange(1,banks+1))
    account = str(random.randrange(4,8))
    account_id = issuer + '.' + division + '.' + 'A' + str(account).zfill(3)
    acct_list.append(account_id)
    if account_id in accts:
        accts[account_id] += 1
    else:
        accts[account_id] = 1

acct_list.sort()

def random_dates(qty):
    date_list = []
    for counter in range(0, qty):
        
        dateoffset = timedelta(days=random.choice(date_offsets))
        houroffset = timedelta(hours=random.choice(hours))
        minoffset = timedelta(minutes=random.choice(minutes))
        secoffset = timedelta(seconds=random.choice(seconds))
        new_date = start_date + dateoffset + houroffset + minoffset + secoffset
        date_list.append(str(new_date))
    date_list.sort()
    return date_list

seqs = []

acctkeys = list(accts.keys())
acctkeys.sort()

for acct in acctkeys:

    acct_dates = random_dates(accts[acct])
    event_list.extend(acct_dates)

    acct_days = {}

    for mydate in acct_dates:
        acct_dateday = acct + '-' + mydate[:10]

        if acct_dateday in acct_days:
            acct_days[acct_dateday] += 1
        else:
            acct_days[acct_dateday] = 1

        seqs.append(acct_days[acct_dateday])


def generate_item(request):
    global date_values

    if(request > (max_rows) ):
        return None
    else:

        if request == 0:
            return '"' + '","'.join(entity_columns) + '"'
        
        else:
            amount = random.randrange(-30, 100)

            merchant = random.choice(merchants)
            city = random.choice(cities)
            day = str(event_list[request-1])[:10]

            part_key = acct_list[request-1]
            sort_key = str(event_list[request-1])[:10] + '.'  + str(seqs[request-1]).zfill(5)
            time_stamp = str(event_list[request-1])

            # if part_key == 'C1.B1.A007':
            #     sort_key = time_stamp

            # if part_key == 'C1.B2.A004':
            #     sort_key = str(uuid.uuid4())


            rowvals = [
                part_key,
                sort_key,

                time_stamp,
                str(amount),
                merchant,
                city,
            ]

            if add_super_sparse:
                cityholder = [''] * len(cities)
                merchantholder = [''] * len(merchants)
                dayholder = [''] * len(date_values)
                
                cityholder[cities.index(city)] = city
                merchantholder[merchants.index(merchant)] = merchant
                dayholder[date_values.index(day)] = day

                rowvals.extend(cityholder)
                rowvals.extend(merchantholder)
                rowvals.extend(dayholder)

            row = '"' + '","'.join(rowvals) + '"'
            
            return row

