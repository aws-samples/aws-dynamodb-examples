import boto3
import argparse
import decimal
import boto3.dynamodb.types
import time

S_TABLE_NAME = "max-str-sk-test-python"
N_TABLE_NAME = "max-num-sk-test-python"
B_TABLE_NAME = "max-bin-sk-test-python"
MAX_SORT_KEY_VALUE_S = str(256 * chr(0x10FFFF))
MAX_SORT_KEY_VALUE_N = decimal.Decimal('9.9999999999999999999999999999999999999E+125')
MAX_SORT_KEY_VALUE_B = boto3.dynamodb.types.Binary(b'\xFF' * 1024)

dynamodb = None

def create_table(tableName, skType):
    global dynamodb

    create_table_params = {
        "TableName": tableName,
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
        print(f'Creating Table {tableName}')
        dynamodb.create_table(**create_table_params)
        print(f'Table {tableName}created successfully')

    except Exception as error:
        print("Error creating table:", error)

def wait_for_tables_ready():
    global dynamodb

    for tableName in [S_TABLE_NAME, N_TABLE_NAME, B_TABLE_NAME]:
        print(f'Waiting for Table {tableName} to be ready')
        while True:
            table = dynamodb.Table(tableName)
            if table.table_status == "ACTIVE":
                print(f'Table {tableName} is ready')
                break
            else:
                time.sleep(1)

    
def insert_item(tableName, skType, skValue):
    global dynamodb

    table = dynamodb.Table(tableName)

    largest_number = decimal.Decimal("9.9999999999999999999999999999999999999e+125")

    put_item_params = {
        "pk": "sample-pk-value",
        "sk": skValue,
    }

    try:
        table.put_item(Item=put_item_params)
        print(f'Item inserted successfully into table "{tableName}"')
    except Exception as error:
        print("Error inserting item:", error)

def main(region):
    global dynamodb

    dynamodb = boto3.resource('dynamodb', region_name=region)
    create_table(S_TABLE_NAME, 'S')
    create_table(N_TABLE_NAME, 'N')
    create_table(B_TABLE_NAME, 'B')
    wait_for_tables_ready()
    insert_item(S_TABLE_NAME, 'S', MAX_SORT_KEY_VALUE_S)
    insert_item(N_TABLE_NAME, 'N', MAX_SORT_KEY_VALUE_N)
    insert_item(B_TABLE_NAME, 'B', MAX_SORT_KEY_VALUE_B)

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--region", required=True, help="AWS region for the DynamoDB table")
    args = parser.parse_args()

    main(args.region)

