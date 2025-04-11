from chalice.test import Client
from app import app
import json
import time

testpath = '/'

testpath = '/query/Products'
category = 'Street'
# last_updated = '2024*'
index = 'idx_category'


post_data = {
    'queryRequest': {
        'index': index,
        'queryConditions': {
            'category': category
        }
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