"""Invoke the IAM-auth Lambda function URL with a SigV4-signed request.

Usage: python3 invoke.py "SELECT 42 AS answer"

Environment:
  STACK_NAME    CloudFormation stack to read the URL from
                (default: DdbDuckdbAnalytics)
  FUNCTION_URL  Skip stack discovery and use this URL directly
  AWS_REGION    Region of the stack (default: us-east-1)
"""

import hashlib
import json
import os
import sys
import urllib.error
import urllib.request

import boto3
from botocore.auth import SigV4Auth
from botocore.awsrequest import AWSRequest

REGION = os.environ.get("AWS_REGION", "us-east-1")
STACK_NAME = os.environ.get("STACK_NAME", "DdbDuckdbAnalytics")


def function_url() -> str:
    if os.environ.get("FUNCTION_URL"):
        return os.environ["FUNCTION_URL"]
    cfn = boto3.client("cloudformation", region_name=REGION)
    outputs = cfn.describe_stacks(StackName=STACK_NAME)["Stacks"][0]["Outputs"]
    for output in outputs:
        if output["OutputKey"] == "FunctionUrl":
            return output["OutputValue"]
    raise SystemExit(f"No FunctionUrl output on stack {STACK_NAME}")


def main() -> None:
    if len(sys.argv) < 2:
        raise SystemExit('Usage: python3 invoke.py "SELECT ..."')
    url = function_url()
    body = json.dumps({"sql": sys.argv[1]})

    credentials = boto3.Session().get_credentials().get_frozen_credentials()
    request = AWSRequest(
        method="POST",
        url=url,
        data=body,
        headers={
            "Content-Type": "application/json",
            # Some SigV4 verification paths require the payload hash header
            # on bodied requests; botocore's SigV4Auth does not add it.
            "x-amz-content-sha256": hashlib.sha256(body.encode()).hexdigest(),
        },
    )
    SigV4Auth(credentials, "lambda", REGION).add_auth(request)

    req = urllib.request.Request(
        url, data=body.encode(), headers=dict(request.headers), method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=125) as resp:
            print(resp.status)
            print(json.dumps(json.loads(resp.read()), indent=2, default=str))
    except urllib.error.HTTPError as e:
        print(e.code)
        print(e.read().decode())


if __name__ == "__main__":
    main()
