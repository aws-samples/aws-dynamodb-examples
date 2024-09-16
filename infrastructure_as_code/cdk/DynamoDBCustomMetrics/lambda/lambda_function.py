# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0
#
# Permission is hereby granted, free of charge, to any person obtaining a copy of this
# software and associated documentation files (the "Software"), to deal in the Software
# without restriction, including without limitation the rights to use, copy, modify,
# merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
# permit persons to whom the Software is furnished to do so.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
# INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
# PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
# HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
# OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
# SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

import json
import boto3
import os

# Constants
#CLOUDWATCH_NAMESPACE = "AWS/DynamoDB"  # official
CLOUDWATCH_NAMESPACE = "Blog/DynamoDB"  # default

dynamodb = boto3.client('dynamodb')
cloudwatch = boto3.client('cloudwatch')

# Environment variables

namespace = ""  # The CloudWatch namespace, if not the default
includes = []   # What tablename or tablename/indexname to include
excludes = []   # What tablename or tablename/indexname to exclude
mentioned_tablenames = []

# Parse environment variables
if 'Namespace' in os.environ:
    namespace = os.environ['Namespace']
else:
    namespace = CLOUDWATCH_NAMESPACE

if 'Includes' in os.environ:
    if not os.environ['Includes'].replace(' ','') == '':
        includes = os.environ['Includes'].replace(' ','').split(',')
if 'Excludes' in os.environ:
    if not os.environ['Excludes'].replace(' ','') == '':
        excludes = os.environ['Excludes'].replace(' ','').split(',')

# Optimization to track what tables were mentioned in the includes
# We don't need to bother describing all tables if the includes list is minimal
for val in includes:
    if "/" in val:
        mentioned_tablenames.append(val.split("/")[0])
    else:
        mentioned_tablenames.append(val)

def handler(event, context):
    # Step one is loop the tables, describing each, and creating the metrics to send
    # We'll not send right away since it's faster to send metrics in large batches
    metrics = []
    paginator = dynamodb.get_paginator('list_tables')    
    for response in paginator.paginate():
        for table_name in response['TableNames']:
            if is_describable(table_name):
                try:
                    response = dynamodb.describe_table(
                        TableName=table_name
                    )
                    if response['Table']['TableStatus'] == 'ACTIVE': # Only add active tables to the list
                        append_metrics(metrics, table_name, response)
                except dynamodb.exceptions.ResourceNotFoundException:
                    print("The table", table_name, "was not found.")
            else:
                print("Skipping table", table_name, "since wasn't covered in the includes")

    # Debug
    print("Writing", len(metrics), "metrics records...")
    
    # Loop over metrics and send in batches of 1,000 (max allowed)
    while len(metrics) > 0:
        write_metrics_batch(metrics[:1000])
        metrics = metrics[1000:]
    
    return {
        'statusCode': 200,
        'body': json.dumps('Finished Table Counts')
    }

# Do we want to bother calling describe_table?
def is_describable(table):
     # No explicit include? Means we want everything
    if includes == []:
        return True
    # Table name listed in the includes? Means we want to dig into it
    if table in mentioned_tablenames:
        return True
    # We didn't find an include, so can skip
    return False

# Environment variable can include what to include
# Name can be table, table/index, or table/*
# Default when empty is to include everything
def is_included(name):
     # No explicit include? Means we want everything
    if includes == []:
        return True
    # Table name listed? Means we want it
    if name in includes:
        return True
    # tablename/* means include all indexes for the given table
    if "/" in name and name.split("/")[0] + "/*" in includes:
        return True
    # We didn't find an include so sorry we don't want you
    return False

# Environment variable can include what to exclude
# Name can be table, table/index, table/*, or */*
def is_excluded(name):
    # No explicit exclude? Means nothing is excluded, so false.
    if excludes == []:
        return False
    # Table name listed? Means we want it excluded
    if name in excludes:
        return True
    # */* case, which means to exclude anything that's an index
    if "/" in name and "*/*" in excludes:
        return True
    # tablename/* case, which means exclude all indexes for the table
    if "/" in name and name.split("/")[0] + "/*" in excludes:
        return True
    # If you get here, you weren't excluded, congratulations
    return False

def append_metrics(metrics, table_name, response):
    # The base table first
    if (is_included(table_name) and not is_excluded(table_name)):
        metrics.extend([
            {
                'Dimensions': [
                    {   
                        'Name': 'TableName',
                        'Value': table_name
                    },
                ],
                'MetricName': 'ItemCount',
                'Value': response['Table']['ItemCount'],
                'Unit': 'Count'
            },
            {
                'Dimensions': [
                    {
                        'Name': 'TableName',
                        'Value': table_name
                    }
                ],
                'MetricName': 'TableSizeBytes',
                'Value': response['Table']['TableSizeBytes'],
                'Unit': 'Bytes'
            }
        ])
    
    # Then LSIs
    if 'LocalSecondaryIndexes' in response['Table']:
        for lsi in response['Table']['LocalSecondaryIndexes']:
            name = table_name + "/" + lsi['IndexName']
            if (is_included(name) and not is_excluded(name)):
                metrics.extend([
                    {
                        'Dimensions': [
                            {   
                                'Name': 'TableName',
                                'Value': table_name
                            },
                            {   
                                'Name': 'LocalSecondaryIndexName',
                                'Value': lsi['IndexName'],
                            },
                        ],
                        'MetricName': 'ItemCount',
                        'Value': lsi['ItemCount'],
                        'Unit': 'Count'
                    },
                    {
                        'Dimensions': [
                            {
                                'Name': 'TableName',
                                'Value': table_name
                            },
                            {   
                                'Name': 'LocalSecondaryIndexName',
                                'Value': lsi['IndexName']
                            },
                        ],
                        'MetricName': 'IndexSizeBytes',
                        'Value': lsi['IndexSizeBytes'],
                        'Unit': 'Bytes'
                    }
                ])

    # Then GSIs
    if 'GlobalSecondaryIndexes' in response['Table']:
        for gsi in response['Table']['GlobalSecondaryIndexes']:
            name = table_name + "/" + gsi['IndexName']
            if (is_included(name) and not is_excluded(name)):
                metrics.extend([
                    {
                        'Dimensions': [
                            {   
                                'Name': 'TableName',
                                'Value': table_name
                            },
                            {   
                                'Name': 'GlobalSecondaryIndexName',
                                'Value': gsi['IndexName']
                            },
                        ],
                        'MetricName': 'ItemCount',
                        'Value': gsi['ItemCount'],
                        'Unit': 'Count'
                    },
                    {
                        'Dimensions': [
                            {
                                'Name': 'TableName',
                                'Value': table_name
                            },
                            {   
                                'Name': 'GlobalSecondaryIndexName',
                                'Value': gsi['IndexName'],
                            },
                        ],
                        'MetricName': 'IndexSizeBytes',
                        'Value': gsi['IndexSizeBytes'],
                        'Unit': 'Bytes'
                    }
                ])

def write_metrics_batch(batch):
    cloudwatch.put_metric_data(
        Namespace = namespace,
        MetricData = batch
    )
