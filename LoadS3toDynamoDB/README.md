# Python script to load data from S3 into a new DynamoDB table
Customers using cloud databases love the convenience of on demand backup and restore. 
With Amazon DynamoDB, you can specify a premium table protection service called Point In Time Recovery. 
With PITR running, the Export feature can then save your table to an S3 bucket upon request. 
A set of files (objects) will arrive in compressed JSON format. 

# Export format

Each export will create a new unique Export ID such as 01615234235014-59974ef8.  
It will then save two metadata files along with a data file folder. 

* manifest-summary.json 
* manifest-files.json
* data/

The manifests reveal valuable information including the item count, and size billed, and number of internal partitions. 

## load.py
A script is provided that uses the manifests to navigate the data folder, open and unzip all the .gz files, and load each item into a new DynamoDB table.

## Configuration hardcoded 
Be sure update the edit the Export ID, DynamoDB table and S3 location at the top of the script, before running.  

## Run it
The script requires you have Python3 and installed modules: boto3, json, and gzip.

python3 load.py

## Disclaimer
Provided as a sample. The script assumes the runtime has an AWS account with appropriate permissions.

## Contribute
Be the first to enhance this code with a Pull Request.
