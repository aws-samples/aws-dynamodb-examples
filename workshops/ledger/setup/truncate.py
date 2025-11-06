import boto3
from botocore.config import Config
import sys

my_config = Config(
region_name='us-west-2',
    retries={
    'max_attempts': 10,
    'mode': 'standard'
    }
)

# Initialize the DynamoDB client
dynamodb = boto3.client('dynamodb', config=my_config)

# Replace with your table name
TABLE_NAME = 'ledger'
PARTITION_KEY = 'AccountID'  
SORT_KEY = 'Event'          


if len(sys.argv) > 1:
    TABLE_NAME = sys.argv[1]


def delete_all_items():
    # Scan the table to retrieve all items
    
    response = dynamodb.scan(TableName=TABLE_NAME)

    items = response.get('Items', [])
    
    # Loop through and delete each item
    for item in items:
        pk_value = item[PARTITION_KEY]
        sk_value = item[SORT_KEY]
        
        print(f"Deleting item with {PARTITION_KEY}: {pk_value['S']}, {SORT_KEY}: {sk_value['S']}")
        
        dynamodb.delete_item(
            TableName=TABLE_NAME,
            Key={
                PARTITION_KEY: pk_value,
                SORT_KEY: sk_value
            }
        )
    
    # Handle pagination if the table has more than 1MB of data
    while 'LastEvaluatedKey' in response:
        response = dynamodb.scan(ExclusiveStartKey=response['LastEvaluatedKey'], TableName=TABLE_NAME)
        items = response.get('Items', [])
        
        for item in items:
            pk_value = item[PARTITION_KEY]
            sk_value = item[SORT_KEY]
            
            print(f"Deleting item with {PARTITION_KEY}: {pk_value}, {SORT_KEY}: {sk_value}")
            
            dynamodb.delete_item(
                TableName=TABLE_NAME,
                Key={
                    PARTITION_KEY: pk_value,
                    SORT_KEY: sk_value
                }
            )

if __name__ == "__main__":
    delete_all_items()
