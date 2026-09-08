"""Report zero-ETL integration status and what has landed in S3 Tables.

Usage: python3 status.py

Environment:
  STACK_NAME  CloudFormation stack to read outputs from
              (default: DdbDuckdbAnalytics)
  AWS_REGION  Region of the stack (default: us-east-1)
"""

import os

import boto3

REGION = os.environ.get("AWS_REGION", "us-east-1")
STACK_NAME = os.environ.get("STACK_NAME", "DdbDuckdbAnalytics")

cfn = boto3.client("cloudformation", region_name=REGION)
outputs = {
    o["OutputKey"]: o["OutputValue"]
    for o in cfn.describe_stacks(StackName=STACK_NAME)["Stacks"][0]["Outputs"]
}
bucket_arn = outputs["TableBucketArn"]
bucket_name = bucket_arn.rsplit("/", 1)[-1]

glue = boto3.client("glue", region_name=REGION)
matched = False
for integration in glue.describe_integrations()["Integrations"]:
    if bucket_name in integration.get("TargetArn", ""):
        matched = True
        print(f"integration status: {integration['Status']}")
        if integration.get("Errors"):
            print(f"errors: {integration['Errors']}")
if not matched:
    print(f"no zero-ETL integration found targeting bucket {bucket_name}")

s3t = boto3.client("s3tables", region_name=REGION)
namespaces = s3t.list_namespaces(tableBucketARN=bucket_arn).get("namespaces", [])
if not namespaces:
    print("s3 tables: no namespaces yet (initial export takes 15-30 minutes)")
for ns in namespaces:
    ns_name = ns["namespace"][0]
    tables = s3t.list_tables(tableBucketARN=bucket_arn, namespace=ns_name).get(
        "tables", []
    )
    print(f"namespace {ns_name}: tables {[t['name'] for t in tables]}")
