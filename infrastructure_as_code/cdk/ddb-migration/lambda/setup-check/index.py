import boto3
import time
import os
import re
from botocore.exceptions import ClientError

def handler(event, context):
    dynamodb = boto3.client('dynamodb')
    lambda_client = boto3.client('lambda')
    table_arn = event['tableArn']
    table_name = table_arn.split('/')[1]
    processor_function_name = os.environ['STREAM_PROCESSOR_FUNCTION_NAME']
    
    try:
        # Get table details and size
        table = dynamodb.describe_table(TableName=table_name)
        size_bytes = table['Table']['TableSizeBytes']
        is_large = size_bytes > 80 * 1024 * 1024 * 1024  # 80GB threshold
        
        # Check if streams are enabled
        stream_specification = table['Table'].get('StreamSpecification', {})
        streams_enabled = stream_specification.get('StreamEnabled', False)
        stream_view_type = stream_specification.get('StreamViewType', False)
        
        # Check PITR status
        pitr_description = dynamodb.describe_continuous_backups(TableName=table_name)
        pitr_status = pitr_description['ContinuousBackupsDescription']['PointInTimeRecoveryDescription']['PointInTimeRecoveryStatus']
        pitr_enabled = pitr_status == 'ENABLED'

        ex_message = list()
        if not streams_enabled:
            ex_message.append("DynamoDB Streams")
        elif stream_view_type != "NEW_AND_OLD_IMAGES":
            ex_message.append("DynamoDB Streams (NEW_AND_OLD_IMAGES view type)")
        if is_large and not pitr_enabled:
            ex_message.append("DynamoDB PITR")

        if len(ex_message):
            raise Exception(f"{' and '.join(ex_message)} is NOT enabled on the source table.")
        
        stream_arn = table['Table']['LatestStreamArn']
        
        # Enable trigger for stream processor
        try:
            response = lambda_client.create_event_source_mapping(
                EventSourceArn=stream_arn,
                FunctionName=processor_function_name,
                StartingPosition='LATEST'
            )
            event_source_mapping_uuid = response['UUID']
        except ClientError as e:
            if e.response['Error']['Code'] == 'ResourceConflictException':
                print(f"Event source mapping already exists for stream {stream_arn} and function {processor_function_name}. Continuing execution.")
                error_message = str(e)
                uuid_match = re.search(r'UUID ([0-9a-f-]+)', error_message)
                if uuid_match:
                    event_source_mapping_uuid = uuid_match.group(1)
                    print(f"Extracted existing event source mapping UUID: {event_source_mapping_uuid}")
            else:
                raise e
        
        # Capture current timestamp for export
        export_time = int(time.time())
        
        return {
            'isLargeTable': is_large,
            'tableName': table_name,
            'exportTime': export_time,
            'tableSize': size_bytes,
            'streamsEnabled': True,
            'streamArn': stream_arn,
            'eventSourceMappingId': event_source_mapping_uuid
        }
    except Exception as e:
        print(f"Error in setup check for table {table_name}: {str(e)}")
        raise e