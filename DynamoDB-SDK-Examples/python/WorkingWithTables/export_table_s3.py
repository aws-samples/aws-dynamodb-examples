from __future__ import print_function  # Python 2/3 compatibility
import boto3
from datetime import datetime
from botocore.exceptions import ClientError
from dateutil.tz import tzlocal

# Export to S3 is only supported, if point in time recovery is enabled.
# Best practice is to externalize table name, can help with renaming of table if we want to restore later.
# Need to create S3 bucket and provide right set of permissions, good to enable version on S3.

s3_bucket_name = "YOUR S3 Bucket"
table_arn = "arn:aws:dynamodb:us-east-1:YOUR AWS ACCOUNT:table/Music"
table_name = "Music"

# Create low level client
session = boto3.session.Session()
client = session.client('dynamodb')

pitr_status = False
backup_response = client.describe_continuous_backups(TableName=table_name)
if backup_response.get("ContinuousBackupsDescription").get("PointInTimeRecoveryDescription").get("PointInTimeRecoveryStatus") == "ENABLED":
    pitr_status = True

print(f"PITR is enabled: {pitr_status}")

if pitr_status:
    try:
        response = client.export_table_to_point_in_time(
            TableArn=table_arn,
            ExportTime=datetime(2021, 12, 16, 16, 45, 0, tzinfo=tzlocal()),
            S3Bucket=s3_bucket_name,
            S3Prefix='DB_BACKUP',
            S3SseAlgorithm='AES256',
            ExportFormat='DYNAMODB_JSON'
        )
        print(response)
    except ClientError as e:
        print(e.response['Error']['Message'])