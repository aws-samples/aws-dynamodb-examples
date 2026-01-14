import json
import boto3
from botocore.exceptions import ClientError
import os

sqs = boto3.client("sqs")
dynamodb = boto3.resource("dynamodb")

SQS_QUEUE_URL = os.environ["SQS_FIFO_QUEUE_URL"]
DYNAMODB_TABLE_NAME = os.environ["DESTINATION_TABLE_NAME"]
DLQ_URL = os.environ["SQS_DLQ_URL"]
MAX_BATCH_SIZE = 25
MAX_RETRIES = 3


def handler(event, context):
    table = dynamodb.Table(DYNAMODB_TABLE_NAME)
    processed_count = 0
    failed_messages = []

    try:
        items_to_write = []
        for record in event["Records"]:
            message = json.loads(record["body"])

            item = message["data"]
            # item["event_type"] = message["event_type"]
            # item["timestamp"] = message["timestamp"]
            # item["sqs_message_id"] = record["messageId"]

            items_to_write.append(item)

            if len(items_to_write) == MAX_BATCH_SIZE:
                unprocessed = batch_write_to_dynamodb(items_to_write)
                process_results(unprocessed, items_to_write, failed_messages)
                processed_count += len(items_to_write) - len(unprocessed)
                items_to_write = []

        # Write any remaining items
        if items_to_write:
            unprocessed = batch_write_to_dynamodb(items_to_write)
            process_results(unprocessed, items_to_write, failed_messages)
            processed_count += len(items_to_write) - len(unprocessed)

        # Handle failed messages
        if failed_messages:
            send_to_dlq_with_retry(failed_messages)

        # Delete successfully processed messages
        delete_processed_messages(event["Records"], failed_messages)

        return {
            "statusCode": 200,
            "body": json.dumps(
                f"Successfully processed {processed_count} messages, Failed: {len(failed_messages)}"
            ),
        }
    except Exception as e:
        print(f"Error processing messages: {str(e)}")
        return {
            "statusCode": 500,
            "body": json.dumps(f"Error processing messages: {str(e)}"),
        }


def batch_write_to_dynamodb(items):
    try:
        response = dynamodb.batch_write_item(
            RequestItems={
                DYNAMODB_TABLE_NAME: [{"PutRequest": {"Item": item}} for item in items]
            }
        )
        unprocessed = response.get("UnprocessedItems", {}).get(DYNAMODB_TABLE_NAME, [])
        return [item["PutRequest"]["Item"] for item in unprocessed]
    except ClientError as e:
        print(f"Error batch writing to DynamoDB: {str(e)}")
        return items  # Consider all items as failed if there's a client error


def process_results(unprocessed_items, all_items, failed_messages):
    for item in unprocessed_items:
        failed_messages.append(
            {
                "Id": item.get("id", "unknown"),
                "MessageBody": json.dumps(
                    {
                        "data": item,
                        "event_type": item.get("event_type"),
                        "timestamp": item.get("timestamp"),
                    }
                ),
                "ReceiptHandle": next(
                    (
                        record["receiptHandle"]
                        for record in event["Records"]
                        if record["messageId"] == item["sqs_message_id"]
                    ),
                    None,
                ),
            }
        )


def send_to_dlq_with_retry(messages):
    for message in messages:
        retry_count = 0
        while retry_count < MAX_RETRIES:
            try:
                sqs.send_message(
                    QueueUrl=DLQ_URL,
                    MessageBody=json.dumps(
                        {
                            "original_message": message,
                            "error": "Failed to write to DynamoDB",
                        }
                    ),
                )
                print(f"Message {message['Id']} sent to DLQ")
                break
            except Exception as e:
                retry_count += 1
                print(
                    f"Attempt {retry_count} failed to send message {message['Id']} to DLQ: {str(e)}"
                )

        if retry_count == MAX_RETRIES:
            print(
                f"CRITICAL: Failed to send message {message['Id']} to DLQ after {MAX_RETRIES} attempts"
            )


def delete_processed_messages(all_messages, failed_messages):
    failed_message_ids = {msg["Id"] for msg in failed_messages}
    messages_to_delete = [
        {"Id": msg["messageId"], "ReceiptHandle": msg["receiptHandle"]}
        for msg in all_messages
        if msg["messageId"] not in failed_message_ids
    ]

    if messages_to_delete:
        sqs.delete_message_batch(QueueUrl=SQS_QUEUE_URL, Entries=messages_to_delete)
