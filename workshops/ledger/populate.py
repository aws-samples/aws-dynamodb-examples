# This script will populate a DynamoDB table with data in a static CSV file
# Example: python3 populate.py ledger.csv ledger

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError
import time
import sys
import math
import importlib

my_config = Config(
    region_name='us-west-2',
    connect_timeout=5, read_timeout=5,
    retries={'total_max_attempts': 3},
)

entity_file = None
table_name = None

if len(sys.argv) > 2:
    entity_file = sys.argv[1]
    table_name = sys.argv[2]
else: 
    print('Error: pass in the name of the entity .csv file, and target table')
    quit()

def populate(dynamodb):

    with open("./../entities/" + entity_file, "r") as file:
        linenum = 0
        attrlistquoted = []
        attrlist = []

        for rawline in file:
            
            line = rawline.strip()

            if linenum == 0:
                attrlistquoted = list(line.split(','))
                attrlist = [item.replace('"', '') for item in attrlistquoted]
                # print(attrlist)
            else:
                
                attrsquoted = list(line.split(','))
                attrs = [item.replace('"', '') for item in attrsquoted]
                # print(attrs)

                new_item = {}
                attrnum = 0

                for attr in attrlist:
                    if attrnum == 0:
                        new_item[attrlist[0]] = {'S': attrs[attrnum]}

                    if attrnum == 1:
                        new_item[attrlist[1]] = {'S': attrs[attrnum]}
                    
                    if attrnum > 1:
                        if len(attrs[attrnum]) > 0:
                            new_item[attr] = {'S': attrs[attrnum]}
                            
                    attrnum += 1

                req = {'TableName':table_name, 'Item':new_item}

                try:
                    response = dynamodb.put_item(**req)
                    print('put line', linenum, ' ', attrs[0], ' ', attrs[1])

                except ClientError as ce:
                        print(ce.response['Error']['Code'] + ': ' + ce.response['Error']['Message'])
                        print(attrlist)
                        # print(ce.response)
            linenum += 1
           


def main(dynamodb=None):

    if not dynamodb:
        dynamodb = boto3.client('dynamodb', config=my_config)

    populate(dynamodb)


if __name__ == "__main__":
    main()

