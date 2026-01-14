import json
import boto3
import os
import hashlib
from datetime import datetime
from botocore.exceptions import ClientError
import logging

# Set up logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

sqs = boto3.client("sqs")

QUEUE_URL = os.environ["SQS_FIFO_QUEUE_URL"]
DLQ_URL = os.environ["SQS_DLQ_URL"]

MAX_RETRIES = 3
MAX_DLQ_RETRIES = 3


def send_message_to_fifo(message):
    retry_count = 0
    while retry_count < MAX_RETRIES:
        try:
            logger.info(
                f"Attempting to send message to FIFO queue: {json.dumps(message)}"
            )
            response = sqs.send_message(
                QueueUrl=QUEUE_URL,
                MessageBody=message["MessageBody"],
                MessageDeduplicationId=message["MessageDeduplicationId"],
                MessageGroupId=message["MessageGroupId"],
            )
            logger.info(
                f"Message sent successfully to FIFO queue. Response: {json.dumps(response)}"
            )
            return True
        except ClientError as e:
            retry_count += 1
            logger.warning(
                f"Failed to send message to FIFO queue. Attempt {retry_count} of {MAX_RETRIES}. Error: {str(e)}"
            )

    logger.error(f"Failed to send message to FIFO queue after {MAX_RETRIES} attempts")
    return False


def send_message_to_dlq(message):
    retry_count = 0
    while retry_count < MAX_DLQ_RETRIES:
        try:
            logger.info(f"Attempting to send message to DLQ: {json.dumps(message)}")
            response = sqs.send_message(
                QueueUrl=DLQ_URL,
                MessageBody=json.dumps(
                    {
                        "original_message": message,
                        "error": "Failed to send to FIFO queue after multiple retries",
                    }
                ),
            )
            logger.info(
                f"Message sent successfully to DLQ. Response: {json.dumps(response)}"
            )
            return True
        except ClientError as e:
            retry_count += 1
            logger.warning(
                f"Failed to send message to DLQ. Attempt {retry_count} of {MAX_DLQ_RETRIES}. Error: {str(e)}"
            )

    logger.error(f"Failed to send message to DLQ after {MAX_DLQ_RETRIES} attempts")
    return False


def handler(event, context):
    logger.info(f"Received event: {json.dumps(event)}")

    for record in event["Records"]:
        if record["eventName"] in ["INSERT", "MODIFY", "DELETE"]:
            item = {
                k: list(v.values())[0]
                for k, v in record["dynamodb"]
                .get("NewImage" if record["eventName"] != "DELETE" else "OldImage", {})
                .items()
            }
            timestamp = record["dynamodb"]["ApproximateCreationDateTime"]

            message_id = generate_unique_id(item, timestamp)

            message = {
                "id": message_id,
                "data": item,
                "event_type": record["eventName"],
                "timestamp": datetime.fromtimestamp(timestamp).isoformat(),
            }

            fifo_message = {
                "MessageBody": json.dumps(message),
                "MessageDeduplicationId": message_id,
                "MessageGroupId": item.get("pk", "default"),
            }

            success = send_message_to_fifo(fifo_message)
            if success:
                logger.info(f"Successfully sent message {message_id} to FIFO queue")
            else:
                logger.error(
                    f"Failed to send message {message_id} to FIFO queue. Attempting to send to DLQ."
                )
                dlq_success = send_message_to_dlq(fifo_message)
                if dlq_success:
                    logger.info(f"Successfully sent message {message_id} to DLQ")
                else:
                    logger.error(
                        f"Failed to send message {message_id} to both FIFO queue and DLQ"
                    )


def generate_unique_id(item, timestamp):
    unique_string = json.dumps(item, sort_keys=True) + str(timestamp)
    return hashlib.md5(unique_string.encode()).hexdigest()
