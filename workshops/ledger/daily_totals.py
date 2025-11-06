import boto3
from botocore.config import Config
from botocore.exceptions import ClientError
import sys
import pprint

my_config = Config(
region_name='us-west-2',
    connect_timeout=5, read_timeout=5,
    retries={'total_max_attempts': 3}
)

TABLE_NAME = 'ledger'
PARTITION_KEY = 'AccountID'  
SORT_KEY = 'Event'      

acct = 'C1.B1.A005'

if len(sys.argv) > 1:
    acct = sys.argv[1]


# Initialize the DynamoDB client
dynamodb = boto3.client('dynamodb', config=my_config)

def process_page(items):

    day_totals = {}

    # Loop through and get each PK
    for item in items:
        amt = 0
        day = None

        pk_value = item[PARTITION_KEY]['S']
        sk_value = item[SORT_KEY]['S']
        if 'Amount' in item:
            amt = item['Amount']['S']
        if 'Day' in item:
            day = item['Day']['S']

        if sk_value != 'HEADER':
            if day in day_totals:
                day_totals[day] += int(amt)
            else:
                day_totals[day] = int(amt)

        # print(pk_value, sk_value, day, amt)

    # print()
    # print(day_totals)
    pk_list = list(day_totals.keys())
    pk_list.sort()
    latest_day = pk_list.pop()
    del day_totals[latest_day]

    print('--')
    print(day_totals)

    for day_total in list(day_totals.keys()):

        new_item = {
            'AccountID': {'S':acct}, 
            'Event': {'S':day_total + '.DAYTOTAL'}, 
            'Day':{'S':day_total},
            'DailyTotal': {'S': str(day_totals[day_total])}
            }
        req = {'TableName':TABLE_NAME, 'Item':new_item}

        try:
            response = dynamodb.put_item(**req)
            print('put', acct, ' ', day, 'DailyTotal:', day_total)

        except ClientError as ce:
            print(ce.response['Error']['Code'] + ': ' + ce.response['Error']['Message'])
                


def query_pk():
    
    response = dynamodb.query(
        TableName=TABLE_NAME,
        KeyConditionExpression='AccountID = :pk',
        ExpressionAttributeValues={
            ':pk': {'S': acct}
        }
    )

    items = response.get('Items', [])

    process_page(items)


if __name__ == "__main__":
    query_pk()
