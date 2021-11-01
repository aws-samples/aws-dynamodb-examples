import boto3

from botocore.exceptions import ClientError

dynamodb = boto3.client('dynamodb', region_name='us-east-1')
params = {
    'statement': 'SELECT * FROM "cerberus-test-3"',
    'next_token': None
}

# Shows we cannot use inbuilt pagination for execute statement.
print(dynamodb.can_paginate('execute_statement'))

while True:
    try:
        if params['next_token'] is None:
            response = dynamodb.execute_statement(
                Statement=params['statement'])

        elif params['next_token']:
            response = dynamodb.execute_statement(
                Statement=params['statement'], NextToken=params['next_token'])

        if 'NextToken' in response:
            params['next_token'] = response['NextToken']
            print("Next token is updated")
        else:
            print("paginated statement executed succesfully")
            break
    except ClientError as error:
        print(error)
