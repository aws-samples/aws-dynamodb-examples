"""Seed the demo table with sample order data for analytics queries.

Usage: python3 seed.py [num_orders]

Environment:
  TABLE_NAME  Override the table to write to. By default the table name
              is read from the stack's TableName output.
  STACK_NAME  CloudFormation stack to read outputs from
              (default: DdbDuckdbAnalytics)
  AWS_REGION  Region of the stack (default: us-east-1)
"""

import os
import random
import sys
from datetime import datetime, timedelta, timezone
from decimal import Decimal

import boto3

REGION = os.environ.get("AWS_REGION", "us-east-1")
STACK_NAME = os.environ.get("STACK_NAME", "DdbDuckdbAnalytics")
CATEGORIES = ["electronics", "books", "grocery", "toys", "sports"]
STATUSES = ["placed", "shipped", "delivered", "returned"]
NUM_ORDERS = int(sys.argv[1]) if len(sys.argv) > 1 else 500


def table_name() -> str:
    if os.environ.get("TABLE_NAME"):
        return os.environ["TABLE_NAME"]
    cfn = boto3.client("cloudformation", region_name=REGION)
    outputs = cfn.describe_stacks(StackName=STACK_NAME)["Stacks"][0]["Outputs"]
    for output in outputs:
        if output["OutputKey"] == "TableName":
            return output["OutputValue"]
    raise SystemExit(f"No TableName output on stack {STACK_NAME}")


name = table_name()
table = boto3.resource("dynamodb", region_name=REGION).Table(name)
now = datetime.now(timezone.utc)
random.seed(42)  # reproducible sample data

with table.batch_writer() as batch:
    for i in range(NUM_ORDERS):
        order_ts = now - timedelta(minutes=random.randint(0, 60 * 24 * 30))
        customer = f"CUST#{random.randint(1, 50):04d}"
        batch.put_item(
            Item={
                "PK": customer,
                "SK": f"ORDER#{order_ts.isoformat()}#{i:06d}",
                "order_id": f"{i:06d}",
                "order_date": order_ts.isoformat(),
                "category": random.choice(CATEGORIES),
                "status": random.choices(STATUSES, weights=[1, 2, 6, 1])[0],
                "amount": Decimal(str(round(random.uniform(5, 500), 2))),
                "items": random.randint(1, 8),
            }
        )

print(f"Wrote {NUM_ORDERS} orders to {name} in {REGION}")
