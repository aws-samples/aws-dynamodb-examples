"""
Step 4: Clean up.

Delete the DynamoDB table created for this walkthrough to avoid incurring
future charges. Deleting the table also removes its vector index.

Amazon Bedrock on-demand embedding calls are billed per request, so there is
no standing Amazon Bedrock resource to delete for this walkthrough.
"""

import boto3

import config

dynamodb = boto3.client("dynamodb")


def delete_table():
    dynamodb.delete_table(TableName=config.TABLE_NAME)
    print(f"Table '{config.TABLE_NAME}' deletion initiated. The table will be removed shortly.")


if __name__ == "__main__":
    delete_table()
