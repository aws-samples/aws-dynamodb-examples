import boto3
from botocore.config import Config
from botocore.exceptions import ClientError
import sys
import pprint
import random

my_config = Config(
region_name='us-west-2',
    connect_timeout=5, read_timeout=5,
    retries={'total_max_attempts': 3}
)

# Replace with your table name
TABLE_NAME = 'ledger'
PARTITION_KEY = 'AccountID'  
SORT_KEY = 'Event'      
ACTION = 'count'   

random.seed(123)

if len(sys.argv) > 1:
    TABLE_NAME = sys.argv[1]

if len(sys.argv) > 2:
    ACTION = sys.argv[2]

page_count = 0
item_count = 0
pk_list = {}
prev_pk = None
all_bucket_dict = None
all_bucket = False
missing_pks = 0

cardholders = ['SAM', 'PAT', 'ANA', 'LEA', 'BOB', 'ZOE']

# Initialize the DynamoDB client
dynamodb = boto3.client('dynamodb', config=my_config)

def pk_report():
    # Scan the table to retrieve all items
    global item_count
    response = dynamodb.scan(TableName=TABLE_NAME)

    items = response.get('Items', [])

    process_page(items)

    # Handle pagination if the table has more than 1MB of data
    while 'LastEvaluatedKey' in response:
        response = dynamodb.scan(ExclusiveStartKey=response['LastEvaluatedKey'], TableName=TABLE_NAME)
        items = response.get('Items', [])
        process_page(items)

    # ------- Done, show summary stats
    if ACTION == 'count':
        print()
        pprint.pprint(pk_list)
    print()
    print('Scan pages :', page_count)
    print('Items      :', item_count)
    if item_count > 0:
        print('Unique PKs :', len(pk_list))
        print('Average item collection size :', str(round(item_count/len(pk_list),1)))

    if ACTION == 'addmissing':
        print()
        print('Missing PK headers written :', missing_pks)


def process_page(items):
    global page_count 
    global prev_pk
    global pk_list
    global item_count
    global all_bucket_dict
    global all_bucket
    global missing_pks

    page_count += 1
    item_count += len(items)
    counter = 0

    # Loop through and get each PK
    for item in items:
        counter += 1
        pk_value = item[PARTITION_KEY]['S']
        sk_value = item[SORT_KEY]['S']
        # print(counter, pk_value, prev_pk, sk_value, all_bucket)
        
        if (prev_pk and prev_pk != pk_value):
            # print('new pk here ----', pk_value,  ' old one:', prev_pk, all_bucket)
            # print()

            if not all_bucket:
                if ACTION == 'addmissing':
                    missing_pks += 1
                    new_item = {
                        'AccountID': {'S':prev_pk}, 
                        'Event': {'S':'HEADER'}, 
                        'AllBucket': {'S':'ALL'},
                        'SpendLimit': {'S':'2000'},
                        'Cardholder': {'S': random.choice(cardholders)}
                        }
                    req = {'TableName':TABLE_NAME, 'Item':new_item}
                    # print(all_bucket, req)
                    # print(all_bucket)
                    try:
                        response = dynamodb.put_item(**req)
                        print('Put new item', prev_pk, 'HEADER')

                    except ClientError as ce:
                            print(ce.response['Error']['Code'] + ': ' + ce.response['Error']['Message'])
                    
            # print()
            all_bucket = False
            
        prev_pk = pk_value
        
        if item.get('AllBucket') and item.get('AllBucket')['S'] == 'ALL':
            all_bucket = True
        
        if pk_value not in pk_list:
            pk_list[pk_value] = 1
        else:
            pk_list[pk_value] += 1
        
        # print(pk_value, sk_value)


if __name__ == "__main__":
    pk_report()
