from chalice.test import Client
from app import app
import json
import time

testpath = '/'


testpath = '/update_record/Customers'

cust_id = 'c111'

post_data = {
    'recordKey': {
        'cust_id': cust_id
    },
    'updateAttributes' : {
        'name': 'Union',
        'email': 'admin@bc.edu',
        'phone': '555-1234',
        'region': 'Northeast',
        'credit_rating': 789,
        'last_updated': '2024-06-18'
    }
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