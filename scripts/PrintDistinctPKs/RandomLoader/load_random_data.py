import boto3
import random
import string

import boto3
import argparse
import decimal
import boto3.dynamodb.types
import time

S_TABLE_NAME = "sk-str-test-data"
N_TABLE_NAME = "sk-num-test-data"
B_TABLE_NAME = "sk-bin-test-data"
MAX_SORT_KEY_VALUE_S = str(256 * chr(0x10FFFF))
MAX_SORT_KEY_VALUE_N = decimal.Decimal('9.9999999999999999999999999999999999999E+125')
MAX_SORT_KEY_VALUE_B = boto3.dynamodb.types.Binary(b'\xFF' * 1024)
TOTAL_ROWS_PER_TABLE = 5000
MAX_ITEMS_PER_PK = 10

dynamodb = None

def create_table(table_name, skType):
    global dynamodb

    create_table_params = {
        "TableName": table_name,
        "KeySchema": [
            {"AttributeName": "pk", "KeyType": "HASH"},
            {"AttributeName": "sk", "KeyType": "RANGE"},
        ],
        "AttributeDefinitions": [
            {"AttributeName": "pk", "AttributeType": "S"},
            {"AttributeName": "sk", "AttributeType": skType},
        ],
        "BillingMode": "PAY_PER_REQUEST",
    }

    try:
        print(f'Creating Table {table_name}')
        dynamodb.create_table(**create_table_params)
        print(f'Table {table_name}created successfully')

    except Exception as error:
        print("Error creating table:", error)

def wait_for_tables_ready():
    global dynamodb

    for table_name in [S_TABLE_NAME, N_TABLE_NAME, B_TABLE_NAME]:
        print(f'Waiting for Table {table_name} to be ready')
        while True:
            table = dynamodb.Table(table_name)
            if table.table_status == "ACTIVE":
                print(f'Table {table_name} is ready')
                break
            else:
                time.sleep(1)


def load_string_data(table_name):
    global dynamodb

    table = dynamodb.Table(table_name)

    # Generate and insert sample data
    total_rows = 0
    while total_rows < TOTAL_ROWS_PER_TABLE:
        pk = ''.join(random.choices(string.ascii_uppercase + string.digits, k=10))
        num_sort_keys = random.randint(1, MAX_ITEMS_PER_PK)
        for j in range(num_sort_keys):
            sk = random.randint(1, 100000)
            put_item_params = {
                "pk": pk,
                "sk": str(sk)
            }
            try:
                table.put_item(Item=put_item_params)
                total_rows += 1
                #print(f'Item inserted successfully into table "{table_name}"')
            except Exception as error:
                print("Error inserting item:", error)
    
    print(f'Table "{table_name}" data inserted successfully.')

def load_number_data(table_name):
    global dynamodb

    table = dynamodb.Table(table_name)

    # Generate and insert sample data
    total_rows = 0
    while total_rows < TOTAL_ROWS_PER_TABLE:
        pk = ''.join(random.choices(string.ascii_uppercase + string.digits, k=10))
        num_sort_keys = random.randint(1, MAX_ITEMS_PER_PK)
        for j in range(num_sort_keys):
            sk = random.randint(1, 100000)
            put_item_params = {
                "pk": pk,
                "sk": sk
            }
            try:
                table.put_item(Item=put_item_params)
                total_rows += 1
                #print(f'Item inserted successfully into table "{table_name}"')
            except Exception as error:
                print("Error inserting item:", error)
    
    print(f'Table "{table_name}" data inserted successfully.')

def load_binary_data(table_name):
    global dynamodb

    table = dynamodb.Table(table_name)

    # Generate and insert sample data
    total_rows = 0
    while total_rows < TOTAL_ROWS_PER_TABLE:
        pk = ''.join(random.choices(string.ascii_uppercase + string.digits, k=10))
        num_sort_keys = random.randint(1, MAX_ITEMS_PER_PK)
        for j in range(num_sort_keys):
            sk = random.randint(1, 100000)
            num_bytes = random.randint(1, 1024)
            put_item_params = {
                "pk": pk,
                "sk": boto3.dynamodb.types.Binary(b'\xFF' * num_bytes),
            }
            try:
                table.put_item(Item=put_item_params)
                total_rows += 1
                #print(f'Item inserted successfully into table "{table_name}"')
            except Exception as error:
                print("Error inserting item:", error)

    print(f'Table "{table_name}" data inserted successfully.')

def main(region):
    global dynamodb

    dynamodb = boto3.resource('dynamodb', region_name=region)
    create_table(S_TABLE_NAME, 'S')
    create_table(N_TABLE_NAME, 'N')
    create_table(B_TABLE_NAME, 'B')
    wait_for_tables_ready()
    load_string_data(S_TABLE_NAME)
    load_number_data(N_TABLE_NAME)
    load_binary_data(B_TABLE_NAME)

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--region", required=True, help="AWS region for the DynamoDB table")
    args = parser.parse_args()

    main(args.region)
