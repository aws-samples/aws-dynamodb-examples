from chalice.test import Client
from app import app
import json
import time

testpath = '/'

# testpath = '/scan'
# testpath = '/list_customers'
testpath = '/new_record/Customers'

epoch_time = int(time.time())
cust_id = 'cust-' + str(epoch_time)
cust_id = 'c225'

post_data = {
    'cust_id': cust_id,
    'name': 'Standard',
    'email': 'admin@bc.edu',
    'phone': '555-1234',
    'region': 'West',
    'credit_rating': 554,
    'last_updated': '2024-06-15'
}


def test_index():
    with Client(app) as client:
        response = client.http.post(
            testpath,
            headers={'Content-Type':'application/json'},
            body=json.dumps(post_data)
        )

        print(json.dumps(response.json_body, indent=2))


test_index()