from chalice.test import Client
from app import app
import json
import time
import sys

testpath = '/delete_record/Customers'

post_data = {
    'cust_id': 'c222'
}

if len(sys.argv) > 1:
    post_data['cust_id'] = sys.argv[1]

if len(sys.argv) > 2:
    post_data['sk_id'] = sys.argv[2]

def test_index():
    with Client(app) as client:
        response = client.http.post(
            testpath,
            headers={'Content-Type':'application/json'},
            body=json.dumps(post_data)
        )

        print(json.dumps(response.json_body, indent=2))


test_index()
