# Write Sharding 
One way to better distribute writes across a partition key space in Amazon DynamoDB is to expand the space. You can do this in several different ways. You can add a random number to the partition key values to distribute the items among partitions. Or you can use a number that is calculated based on something that you're querying on.

## Examples
Code examples provided demonstrate writing and reading from a DynamoDB table using write sharding.

## Run it
Python: The script requires you have Python3 and installed modules: boto3, json, and random.

python3 WriteShardingExample.py

## Disclaimer
Provided as a sample. The script assumes the runtime has an AWS account with appropriate permissions.

## Contribute
Be the first to enhance this code with a Pull Request.