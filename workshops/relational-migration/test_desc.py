from chalice.test import Client
from app import app
import json
import os

table_name = 'OrderLines'
testpath = '/desc_table/' + table_name


def test_index():
    with Client(app) as client:

        response = client.http.get(testpath)
        print()
        print(json.dumps(response.json_body, indent=2))


test_index()

