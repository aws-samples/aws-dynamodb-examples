import sys
from datetime import datetime

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

def get_accountlist(dynamodb):
    scan_response = dynamodb.scan(
        TableName=target_table,
        IndexName='GSI_AccountPrimary'
    )
    account_list = [item['AccountID']['S'] for item in scan_response['Items']]
    return(account_list)


def rollup(dynamodb, account=None):
    account_list = []

    if account:
        account_list.append(account)
    else:
        account_list = get_accountlist(dynamodb)

    for account in account_list:

        query_response = dynamodb.query(
            TableName='journal-indexed',
            KeyConditionExpression='AccountID=:AccountID and Event < :ap',
            ExpressionAttributeValues={':AccountID': {'S':account}, ':ap': {'S':'AccountPrimary'}},
            ScanIndexForward=True,  # Sort descending by sort key
            ConsistentRead=False
        )
        daily_totals = {}

        for journalentry in query_response['Items']:
            event = journalentry['Event']['S']
            entryday = journalentry['Datetime']['S'][:10]
            charged = journalentry['Charged']['S']
            
            day_previous = daily_totals.get(entryday, 0)
            daily_totals[entryday] = day_previous + int(charged)

        print()
        print('Account : ', account)
        if(daily_totals):
            for eod in sorted(daily_totals):
                print('  ' + eod + '   : ' + str(daily_totals[eod]))
        else:
            print('  -none-')


def main(dynamodb=None):

    if not dynamodb:
        dynamodb = boto3.client('dynamodb', config=my_config)

    rollup(dynamodb)


if __name__ == "__main__":
    
    main()