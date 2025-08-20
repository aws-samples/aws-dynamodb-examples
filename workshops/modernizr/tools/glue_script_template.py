#!/usr/bin/env python3
"""
Improved Glue ETL Script Template
Based on the working example provided by the user
"""

import sys
import boto3
from awsglue.transforms import *
from awsglue.utils import getResolvedOptions
from awsglue.dynamicframe import DynamicFrame
from pyspark.context import SparkContext
from awsglue.context import GlueContext
from awsglue.job import Job
from pyspark.sql.functions import col, isnan, when, count

# Get job parameters
args = getResolvedOptions(sys.argv, ['JOB_NAME'])
sc = SparkContext()
glueContext = GlueContext(sc)
spark = glueContext.spark_session
job = Job(glueContext)
job.init(args['JOB_NAME'], args)

# Configuration - these will be replaced by the migration script
VIEW_NAME = "{view_name}"
TABLE_NAME = "{table_name}"
AWS_REGION = "{aws_region}"

# Read from MySQL using the Glue connection
try:
    print(f"Attempting to read from MySQL using Glue connection: mysql-modernizr-connection")
    mysql_df = glueContext.create_dynamic_frame.from_options(
        connection_type="mysql",
        connection_options={
            "useConnectionProperties": "true",
            "connectionName": "mysql-modernizr-connection",
            "dbtable": VIEW_NAME
        },
        transformation_ctx="mysql_source"
    )
    
    # Check if data exists
    record_count = mysql_df.count()
    print(f"Found {record_count} records in {VIEW_NAME}")
    
    if record_count == 0:
        print(f"Warning: No data found in {VIEW_NAME}")
        job.commit()
        sys.exit(0)
        
except Exception as e:
    print(f"Error reading from MySQL: {str(e)}")
    job.commit()
    sys.exit(1)

# Transform the data if needed
try:
    print("Processing data for DynamoDB write")
    
    # Print schema for debugging
    print("MySQL data schema:")
    mysql_df.printSchema()
    
    # Show sample data  
    print("Sample data from MySQL:")
    mysql_df.show(5)
    
    # Check for null patterns
    spark_temp_df = mysql_df.toDF()
    print("Checking null patterns in the data...")
    for col_name in spark_temp_df.columns[:10]:  # Check first 10 columns
        null_count = spark_temp_df.filter(col(col_name).isNull() | (col(col_name) == 'None')).count()
        total_count = spark_temp_df.count()
        print(f"Column '{col_name}': {null_count}/{total_count} null values")
    
    # Filter out null values for DynamoDB (DynamoDB doesn't accept null values)
    def filter_nulls_for_dynamodb(record):
        """Remove null/None values from record for DynamoDB compatibility"""
        filtered_record = {}
        for key, value in record.items():
            # Keep only non-null values
            if value is not None and str(value).lower() != 'null':
                # Also filter empty strings for cleaner data
                if isinstance(value, str) and value.strip() == '':
                    continue
                filtered_record[key] = value
        return filtered_record
    
    # Apply null filtering transformation
    print("Filtering null values for DynamoDB compatibility...")
    transformed_df = Map.apply(frame=mysql_df, f=filter_nulls_for_dynamodb)
    
    # Show sample transformed data
    print("Sample data after null filtering:")
    transformed_df.show(5)
    
    # Check final record count
    final_count = transformed_df.count()
    print(f"Records after filtering: {final_count}")
    
    if final_count == 0:
        print("Warning: No records remain after filtering. This might indicate all data was null.")
        job.commit()
        sys.exit(0)
    
except Exception as e:
    print(f"Error transforming data: {str(e)}")
    job.commit()
    sys.exit(1)

# Write to DynamoDB
try:
    print(f"Writing data to DynamoDB table: {TABLE_NAME}")
    glueContext.write_dynamic_frame.from_options(
        frame=transformed_df,
        connection_type="dynamodb",
        connection_options={
            "dynamodb.region": AWS_REGION,
            "dynamodb.output.tableName": TABLE_NAME,
            "dynamodb.throughput.write.percent": "1.0"
        },
        transformation_ctx="dynamodb_sink"
    )
    
    final_count = transformed_df.count()
    print(f"Successfully migrated {final_count} records to DynamoDB {TABLE_NAME} table")
    
except Exception as e:
    print(f"Error writing to DynamoDB: {str(e)}")
    job.commit()
    sys.exit(1)

# Commit the job
job.commit()
print("Job completed successfully")