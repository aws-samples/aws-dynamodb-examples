import sys

account = 'C1.B2.A001'
target_table = 'journal-indexed'

if len(sys.argv) > 1:
    account = sys.argv[1]

import boto3 
from botocore.config import Config 
from botocore.exceptions import ClientError 

my_config = Config(
    region_name='us-east-1',
    connect_timeout=5, read_timeout=5,
    retries={'total_max_attempts': 3, 'mode': 'standard'},
)

def rollup(account, dynamodb):
    print()

    query_response = dynamodb.query(
        TableName=target_table,
        KeyConditionExpression='AccountID=:AccountID',
        ExpressionAttributeValues={':AccountID': {'S':account}},
        ScanIndexForward=True,  # Sort descending by sort key
        Limit=1,  # Return just the first item found
        ReturnConsumedCapacity='TOTAL',
        ConsistentRead=False
    )

def main(dynamodb=None):

    if not dynamodb:
        dynamodb = boto3.client('dynamodb', config=my_config)

    rollup(account, dynamodb)


if __name__ == "__main__":
    
    main()