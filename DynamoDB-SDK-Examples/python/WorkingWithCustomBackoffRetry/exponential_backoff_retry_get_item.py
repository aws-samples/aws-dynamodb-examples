from time import sleep
import boto3
import json

from botocore.exceptions import ClientError
from botocore.config import Config

RETRY_NAMED_EXCEPTIONS = ('ProvisionedThroughputExceededException',
                          'ThrottlingException')

# disable default retry and override default exponential back up behaviour with your custom algorithm.
config = Config(
    retries={'max_attempts': 1})

dynamodb = boto3.resource('dynamodb', region_name='us-east-1', config=config)


table = dynamodb.Table('Music')
retries = 0

condition = True

# overload default retry can be custom value
max_retry_config = 10

while condition and retries < max_retry_config:
    try:
        # custom backoff time can be used here.
        # sleep for hundred milli second.
        sleep((2 ** retries)/10)

        response = table.get_item(
            Key={
                'artist': "jimmy",
                'title': "HoliDay"
            }
        )
        print(response)
    except ClientError as error:
        if error.response['Error']['Code'] not in RETRY_NAMED_EXCEPTIONS:
            condition = False
            raise
        retries+=1
        print('custom back off in place for retries{}'.format(retries))

    else:
        print("Get item succuesfully complete without exception")
        condition = False

