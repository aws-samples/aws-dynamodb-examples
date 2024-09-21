from chalice.test import Client
from app import app
import json
import os

testpath = '/scan_table/Customers'


def test_index():
    with Client(app) as client:

        response = client.http.get(testpath)
#         headers = {"Content-Type": "application/json"})
        print()
        print(json.dumps(response.json_body, indent=2))


test_index()

