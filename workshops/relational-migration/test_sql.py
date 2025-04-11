from chalice.test import Client
from app import app
import json
import time

testpath = '/runsql'

sql = 'SELECT prod_id, name, category, list_price, last_updated FROM Products LIMIT 3'

# sql = 'UPDATE Products SET list_price = list_price + 1 WHERE prod_id = "0001"'

sql = 'CREATE OR REPLACE VIEW vTest AS SELECT * FROM Products LIMIT 2'

post_data = {
    'sql':sql
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