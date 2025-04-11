from chalice.test import Client
from app import app
import json
import time

testpath = '/update_record/Customers'

cust_id = 'c223'

post_data = {
    'Key': {
        'cust_id': cust_id
    },
    'updateAttributes' : {
        'email': 'admin@bcect.edu',
        'region': 'Northerneey',
        'credit_rating': 122.3,
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