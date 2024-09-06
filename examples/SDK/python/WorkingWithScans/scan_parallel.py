from __future__ import print_function  # Python 2/3 compatibility
import time, sys, boto3, threading
from botocore.exceptions import ClientError

# Create Client
session = boto3.session.Session(region_name="eu-west-1")
dynamoDbClient = session.client('dynamodb')


def scan_table(segment, total_segments):

    # Print thread starting info
    print('Starting Segment ' + str(segment))

    try:
        # Initial scan
        response = dynamoDbClient.scan(
            TableName=table_name,
            Segment=segment,
            TotalSegments=total_segments
            )
   

        # Paginate for each thread, returning 1MB of data each iteration
        while 'LastEvaluatedKey' in response:
                response = dynamoDbClient.scan(
                    TableName=table_name,
                    Segment=segment,
                    TotalSegments=total_segments,
                    ExclusiveStartKey=response['LastEvaluatedKey']
                )

    except ClientError as error:
        print("Something went wrong: ")
        print(error.response['ResponseMetadata'])


def create_threads():
    thread_list = []

    # Instantiate and store the thread
    for i in range(threads):
        thread = threading.Thread(
            target=scan_table, args=(i, threads))
        thread_list.append(thread)

    # Start threads
    for thread in thread_list:
        thread.start()

    # Block main thread until all threads are finished
    for thread in thread_list:
        thread.join()

# Main Function / Timer
if __name__ == "__main__":

    table_name = "AmazonBins"

    # Number of threads
    threads = 10

    # Calculate time taken
    start = time.time()

    # Create Threads
    create_threads()

    # Finish time after all threads are complete
    end = time.time()

    # Print time took
    print(end - start)
