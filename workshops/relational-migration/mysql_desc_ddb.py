from chalice.test import Client
from app import app
import json
import os
import sys

table_name = 'Customers'
if len(sys.argv) > 1:
    table_name = sys.argv[1]

path = '/desc_table/' + table_name


def main():
    with Client(app) as client:

        ddb = {
            "TableName": table_name,
            "KeySchema": [],
            "AttributeDefinitions": [],
            "BillingMode": "PAY_PER_REQUEST"
        }
        ks = []
        columns = {}
        key_list = {}
        ads = []
        gsi_dict = {}
        gsis = []

        response = client.http.get(path)

        metadata = response.json_body
        for row in metadata:
            if row['INFO_TYPE'] == 'TABLE':
                columns[row['COLUMN_NAME']] = row['COLUMN_TYPE']

            if row['INFO_TYPE'] == 'INDEX':
                key_list[row['COLUMN_NAME']] = 1
                if row['INDEX_NAME'] == 'PRIMARY':
                    if row['SEQ_IN_INDEX'] == 1:
                        ks.append({"AttributeName":row['COLUMN_NAME'], "KeyType": "HASH"})
                    if row['SEQ_IN_INDEX'] == 2:
                        ks.append({"AttributeName":row['COLUMN_NAME'], "KeyType": "RANGE"})
                else:
                    if row['SEQ_IN_INDEX'] == 1:
                        gsis.append({"IndexName":row['INDEX_NAME'], "KeySchema": [{"AttributeName":row['COLUMN_NAME'],"KeyType":"HASH"}], "Projection": {"ProjectionType":"ALL"}})
                    else:
                        gsis[-1]['KeySchema'].append({"AttributeName":row['COLUMN_NAME'],"KeyType":"RANGE"})

        for key in key_list:
            ads.append({"AttributeName": key, "AttributeType": convert_type(columns[key])})


        ddb['KeySchema'] = ks
        ddb['AttributeDefinitions'] = ads
        ddb['GlobalSecondaryIndexes'] = gsis

        print(json.dumps(ddb, indent=2))

        # print(response.json_body)
        # print(json.dumps(response.json_body, indent=2))


def convert_type(sql_type):

    return_type = 'S'
    type_string = sql_type.split('(')[0]

    if type_string in ['int', 'integer', 'bigint', 'mediumint', 'tinyint', 'float', 'double', 'decimal', 'dec']:
        return_type = 'N'
    if type_string in ['varchar', 'char', 'text', 'tinytext']:
        return_type = 'S'
    if type_string in ['datetime', 'date', 'time', 'year']:
        return_type = 'S'
    if type_string in ['timestamp']:
        return_type = 'N'

    return return_type


if __name__ == "__main__":
    main()

