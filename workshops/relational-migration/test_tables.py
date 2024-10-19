from chalice.test import Client
from app import app
import json
import os

testpath = '/list_tables/'


def test_index():
    with Client(app) as client:

        response = client.http.get(testpath)

        print(json.dumps(response.json_body, indent=2))


test_index()

