from chalice.test import Client
from app import app
import json
import os, sys

view_name = 'vCustOrders'

if len(sys.argv) > 1:
    view_name = sys.argv[1]

testpath = '/desc_view/' + view_name

def test_index():
    with Client(app) as client:

        response = client.http.get(testpath)
        view_definition = response.json_body.get('VIEW_DEFINITION', 'None')
        print(view_definition)
        print()

test_index()

