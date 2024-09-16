from chalice.test import Client
from app import app
import json

testpath = '/scan'
testpath = '/query/user100'
testpath = '/get/user100/AshlandValley'
# testpath = '/update/user100/AshlandValley/-3'


def test_index():
    with Client(app) as client:
        response = client.http.get(testpath)
        print()
        print(json.dumps(response.json_body))


test_index()
