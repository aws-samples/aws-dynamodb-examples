"""
Step 1: Create a DynamoDB table with a vector index, then wait until the
table and its vector index are ACTIVE.

Vector indexes are supported only on tables that use the on-demand
(PAY_PER_REQUEST) capacity mode.
"""

import time

import boto3

import config

dynamodb = boto3.client("dynamodb")


def create_table():
    dynamodb.create_table(
        TableName=config.TABLE_NAME,
        AttributeDefinitions=[
            {"AttributeName": "paper_id", "AttributeType": "S"},
        ],
        KeySchema=[
            {"AttributeName": "paper_id", "KeyType": "HASH"},
        ],
        VectorIndexes=[
            {
                "IndexName": config.INDEX_NAME,
                "VectorAttribute": {"AttributeName": "embedding"},
                "Dimensions": config.EMBEDDING_DIMENSIONS,
                "DistanceFunction": config.DISTANCE_FUNCTION,
                "Projection": {
                    "ProjectionType": "ALL",   # ALL | KEYS_ONLY | INCLUDE
                },
            }
        ],
        BillingMode="PAY_PER_REQUEST",
    )
    print(f"Table '{config.TABLE_NAME}' created with vector index. The table will be ready shortly.")


def wait_until_active(table_name, index_name):
    """Table and vector index creation happen asynchronously."""
    while True:
        table = dynamodb.describe_table(TableName=table_name)["Table"]
        table_status = table["TableStatus"]

        # Find our vector index
        index_status = None
        backfilling = False
        for vi in table.get("VectorIndexes", []):
            if vi["IndexName"] == index_name:
                index_status = vi["IndexStatus"]
                backfilling = vi.get("Backfilling", False)
                break

        print(f"Table: {table_status} | Vector index: {index_status} | Backfilling: {backfilling}")

        if table_status == "ACTIVE" and index_status == "ACTIVE" and not backfilling:
            print("Table and vector index are ready.")
            return table

        time.sleep(5)


if __name__ == "__main__":
    create_table()
    wait_until_active(config.TABLE_NAME, config.INDEX_NAME)
