import json
import boto3
import urllib3

http = urllib3.PoolManager()

def send_response(event, context, status, reason=None):
    response_body = {
        "Status": status,
        "Reason": reason or "",
        "PhysicalResourceId": context.log_stream_name,
        "StackId": event["StackId"],
        "RequestId": event["RequestId"],
        "LogicalResourceId": event["LogicalResourceId"],
    }

    url = event["ResponseURL"]
    encoded_body = json.dumps(response_body).encode("utf-8")
    headers = {"Content-Type": ""}

    try:
        http.request("PUT", url, body=encoded_body, headers=headers)
    except Exception as e:
        print(f"Failed to send response: {str(e)}")


def lambda_handler(event, context):
    print(f"Received event: {json.dumps(event)}")

    try:
        if event["RequestType"] in ["Create", "Update"]:
            source_account_id = event["ResourceProperties"]["SourceAccountId"]
            current_account_id = boto3.client("sts").get_caller_identity()["Account"]

            if source_account_id != current_account_id:
                raise ValueError(
                    f"The account ID of the DynamoDB source table {source_account_id} does not match current account ID {current_account_id}."
                )

        # Respond success
        send_response(event, context, "SUCCESS")

    except Exception as e:
        print(f"Error: {str(e)}")
        send_response(event, context, "FAILED", str(e))