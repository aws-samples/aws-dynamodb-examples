"""Custom resource handler: empty an S3 Table Bucket on stack deletion.

The zero-ETL integration creates namespaces and Iceberg tables inside
the table bucket outside of CloudFormation. DeleteTableBucket refuses
while they exist, so this handler removes them first. Create and Update
are no-ops.
"""

import boto3


def handler(event, _context):
    if event["RequestType"] != "Delete":
        return {"PhysicalResourceId": _resource_id(event)}

    bucket_arn = event["ResourceProperties"]["TableBucketArn"]
    s3t = boto3.client("s3tables")

    paginator = s3t.get_paginator("list_namespaces")
    for page in paginator.paginate(tableBucketARN=bucket_arn):
        for ns in page.get("namespaces", []):
            ns_name = ns["namespace"][0]
            table_pages = s3t.get_paginator("list_tables").paginate(
                tableBucketARN=bucket_arn, namespace=ns_name
            )
            for table_page in table_pages:
                for table in table_page.get("tables", []):
                    s3t.delete_table(
                        tableBucketARN=bucket_arn,
                        namespace=ns_name,
                        name=table["name"],
                    )
            s3t.delete_namespace(tableBucketARN=bucket_arn, namespace=ns_name)

    return {"PhysicalResourceId": _resource_id(event)}


def _resource_id(event):
    return event.get(
        "PhysicalResourceId",
        f"empty-{event['ResourceProperties']['TableBucketArn'].rsplit('/', 1)[-1]}",
    )
