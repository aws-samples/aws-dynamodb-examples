import argparse
import boto3
import decimal
import time
import boto3.dynamodb.types
from botocore.exceptions import ClientError

MAX_SORT_KEY_VALUE_S = str(256 * chr(0x10FFFF))
MAX_SORT_KEY_VALUE_N = decimal.Decimal('9.9999999999999999999999999999999999999E+125')
MAX_SORT_KEY_VALUE_B = boto3.dynamodb.types.Binary(b'\xFF' * 1024)

def print_distinct_pks(region, table_name):
    dynamodb = boto3.resource('dynamodb', region_name=region)
    table = dynamodb.Table(table_name)

    partition_key_name = table.key_schema[0]['AttributeName']
    sort_key_name = table.key_schema[1]['AttributeName']
    sort_key_type = table.attribute_definitions[1]['AttributeType']
    # Determine the maximum value of the sort key based on its type
    max_sort_key_value = ''
    if sort_key_type == 'S':
        max_sort_key_value = MAX_SORT_KEY_VALUE_S
    elif sort_key_type == 'N':
        max_sort_key_value = MAX_SORT_KEY_VALUE_N
    elif sort_key_type == 'B':
        max_sort_key_value = MAX_SORT_KEY_VALUE_B
    else:
        raise ValueError(f"Unsupported sort key type: {sort_key_type}")

    last_evaluated_key = None

    while True:
        try:
            scan_params = {
                'TableName': table_name,
                'Limit': 1,
            }

            if last_evaluated_key:
                scan_params['ExclusiveStartKey'] = last_evaluated_key

            response = table.scan(**scan_params)
            items = response['Items']

            if len(items) > 0:
                print(items[0]['pk'])

            if 'LastEvaluatedKey' not in response:
                break

            last_key = response['LastEvaluatedKey']
            partition_key_value = last_key[partition_key_name]
            sort_key_value = last_key[sort_key_name]

            # Create a new key with the maximum value of the sort key
            new_key = {
                partition_key_name: partition_key_value,
                sort_key_name: max_sort_key_value
            }

            last_evaluated_key = new_key

        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == 'InternalServerError' or error_code == 'ThrottlingException':
                print(f"Received an error: {error_code}, retrying...")
                time.sleep(1)
            else:
                raise

if __name__ == '__main__':
    # Define CLI arguments
    parser = argparse.ArgumentParser()
    parser.add_argument('--region', required=True, help='AWS Region')
    parser.add_argument('--table-name', required=True, help='Name of the DynamoDB table')
    args = parser.parse_args()

    # Call the function with the specified table name
    print_distinct_pks(args.region, args.table_name)
