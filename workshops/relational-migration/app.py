from chalice import Chalice
import boto3
from botocore.exceptions import ClientError
import logging
import os
import json
import mysql.connector


migration_stage = 'relational'
# 'relational', 'dual-write', 'dynamodb']

if "MIGRATION_STAGE" in os.environ:
    migration_stage = os.environ['MIGRATION_STAGE']

if migration_stage == 'relational' or migration_stage == 'dual-write':
    from chalicelib import mysql_calls as db
else:
    from chalicelib import dynamodb_calls as db

app = Chalice(app_name='migration')

region = "us-west-2"

if "AWS_DEFAULT_REGION" in os.environ:
    region = os.environ['AWS_DEFAULT_REGION']

@app.route('/', methods=['GET'], cors=True)
def ping():
    request = app.current_request
    context = request.to_dict()['context']
    return_status = {'engine': db.engine()}

    if 'stage' in context:
        return_status['stage'] = context['stage']

    return return_status


@app.route('/list_tables', methods=['GET'], cors=True)
def list_tables():
    request = app.current_request
    return db.list_tables()

@app.route('/desc_table/{table}', methods=['GET'], cors=True)
def desc_table(table):
    return db.desc_table(table)

@app.route('/desc_view/{view}', methods=['GET'], cors=True)
def desc_view(view):
    result = db.desc_view(view)
    return result

@app.route('/scan_table/{table}', methods=['GET'], cors=True)
def desc_table(table):
    return db.scan_table(table)

@app.route('/get_record/{table}', methods=['POST'], cors=True, content_types=['application/json'])
def get_record(table):
    return db.get_record(table, app.current_request.json_body)

@app.route("/new_record/{table}", methods=['POST'], cors=True, content_types=['application/json'])
def new_record(table):
#     print(json.dumps(app.current_request.json_body, indent=2))
    result = db.new_record(table, app.current_request.json_body)
    return result

@app.route("/update_record/{table}", methods=['POST'], cors=True, content_types=['application/json'])
def update_record(table):
    return db.update_record(table, app.current_request.json_body)

@app.route("/delete_record/{table}", methods=['POST'], cors=True, content_types=['application/json'])
def delete_record(table):
    print(json.dumps(app.current_request.json_body, indent=2))
    result = db.delete_record(table, app.current_request.json_body)
    return result

@app.route('/query/{table}', methods=['POST'], cors=True, content_types=['application/json'])
def query(table):
    return db.query(table, app.current_request.json_body)

@app.route("/runsql", methods=['POST'], cors=True, content_types=['application/json'])
def runsql():
    return db.runsql(app.current_request.json_body)

