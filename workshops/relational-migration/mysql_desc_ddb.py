from chalice.test import Client
from app import app
import json
import os
import sys

table_name = 'Customers'
keys_needed = 2 # i.e. both PK & SK in case of a VIEW with no key schema. You can also set to just 1 key.

if len(sys.argv) > 1:
    table_name = sys.argv[1]

if len(sys.argv) > 2:
    keys_needed = sys.argv[2]

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
        keys_found = 0

        response = client.http.get(path)

        metadata = response.json_body

        counter = 0
        col1 = None # to be used if this is a VIEW
        col2 = None

        for row in metadata:
            counter += 1
            if counter == 1:
                col1 = row
            if counter == 2:
                col2 = row

            if row['INFO_TYPE'] == 'TABLE':
                columns[row['COLUMN_NAME']] = row['COLUMN_TYPE']

            if row['INFO_TYPE'] == 'INDEX':
                key_list[row['COLUMN_NAME']] = 1
                if row['INDEX_NAME'] == 'PRIMARY':
                    keys_found += 1
                    if row['SEQ_IN_INDEX'] == 1:
                        ks.append({"AttributeName":row['COLUMN_NAME'], "KeyType": "HASH"})
                    if row['SEQ_IN_INDEX'] == 2:
                        ks.append({"AttributeName":row['COLUMN_NAME'], "KeyType": "RANGE"})
                else:
                    if row['SEQ_IN_INDEX'] == 1:
                        gsis.append({"IndexName":row['INDEX_NAME'], "KeySchema": [{"AttributeName":row['COLUMN_NAME'],"KeyType":"HASH"}], "Projection": {"ProjectionType":"ALL"}})
                    else:
                        gsis[-1]['KeySchema'].append({"AttributeName":row['COLUMN_NAME'],"KeyType":"RANGE"})


        if keys_found == 0: # VIEW with no key schema.. yet
            key_list[col1['COLUMN_NAME']] = 1
            ks.append({"AttributeName":col1['COLUMN_NAME'], "KeyType": "HASH"})
            if keys_needed == '2':
                key_list[col2['COLUMN_NAME']] = 1
                ks.append({"AttributeName":col2['COLUMN_NAME'], "KeyType": "RANGE"})


        for key in key_list:
            ads.append({"AttributeName": key, "AttributeType": convert_type(columns[key])})

        ddb['KeySchema'] = ks
        ddb['AttributeDefinitions'] = ads
        if gsis:
            ddb['GlobalSecondaryIndexes'] = gsis

        print(json.dumps(ddb, indent=2))


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

