import boto3
import os
import json
import re
from botocore.exceptions import ClientError

def handler(event, context):
    lambda_client = boto3.client('lambda')
    
    fifo_queue_arn = os.environ['FIFO_QUEUE_ARN']
    write_cdc_function_name = os.environ['WRITE_CDC_FUNCTION_NAME']
    migration_time = event['migrationTime']
    
    try:
        response = lambda_client.create_event_source_mapping(
            EventSourceArn=fifo_queue_arn,
            FunctionName=write_cdc_function_name,
            BatchSize=10,
            FilterCriteria={
                'Filters': [
                    {
                        'Pattern': json.dumps({
                            'timestamp': [{'numeric': ['>=', migration_time]}]
                        })
                    }
                ]
            }
        )
        return {
            'EventSourceMappingId': response['UUID']
        }
    except ClientError as e:
        if e.response['Error']['Code'] == 'ResourceConflictException':
            # Extract UUID from the exception message
            uuid_match = re.search(r'UUID\s+([0-9a-f-]+)', str(e))
            if uuid_match:
                existing_uuid = uuid_match.group(1)
                return {
                    'EventSourceMappingId': existing_uuid,
                    'Message': 'Event source mapping already exists'
                }
            else:
                raise Exception("Event source mapping already exists. In addition, UUID for the mapping not found in the exception message")
        else:
            # If it's a different exception, re-raise it
            raise

    
