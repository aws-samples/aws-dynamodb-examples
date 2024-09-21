from chalice.test import Client
from app import app
import json
import time

testpath = '/'

testpath = '/get_record/Products'

prod_id = '0009'

post_data = {
    'Key': {
        'prod_id': prod_id
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