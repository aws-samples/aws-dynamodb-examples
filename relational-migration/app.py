import os
# import time, datetime
import json
from chalice import Chalice
from chalicelib import mysql_calls as db
# from chalicelib import dynamodb_calls as db

import mysql.connector
import logging

import boto3
from botocore.exceptions import ClientError

app = Chalice(app_name='migration')

region = "us-east-2"
sql = "select * from Boston"

if "AWS_DEFAULT_REGION" in os.environ:
    region = os.environ['AWS_DEFAULT_REGION']

@app.route('/', methods=['GET'], cors=True)
def ping():
    return {'engine': db.engine()}


@app.route('/list_tables', methods=['GET'], cors=True)
def list_tables():
    request = app.current_request
#     print(request.to_dict())
    return db.list_tables()


@app.route('/desc_table/{table}', methods=['GET'], cors=True)
def desc_table(table):
    return db.desc_table(table)


@app.route('/scan_table/{table}', methods=['GET'], cors=True)
def desc_table(table):
    return db.scan_table(table)

@app.route('/get_record/{table}', methods=['POST'], cors=True, content_types=['application/json'])
def get_record(table):
    return db.get_record(table, app.current_request.json_body)

@app.route("/new_record/{table}", methods=['POST'], cors=True, content_types=['application/json'])
def new_record(table):
    return db.new_record(table, app.current_request.json_body)

@app.route("/update_record/{table}", methods=['POST'], cors=True, content_types=['application/json'])
def update_record(table):
    return db.update_record(table, app.current_request.json_body)

@app.route("/delete_record/{table}", methods=['POST'], cors=True, content_types=['application/json'])
def delete_record(table):
    return db.delete_record(table, app.current_request.json_body)

@app.route('/query/{table}', methods=['POST'], cors=True, content_types=['application/json'])
def query(table):
    return db.query(table, app.current_request.json_body)

@app.route("/runsql", methods=['POST'], cors=True, content_types=['application/json'])
def runsql():
    return db.runsql(app.current_request.json_body)

