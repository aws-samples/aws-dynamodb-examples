import sys
from pyspark.context import SparkContext
from awsglue.context import GlueContext
from awsglue.job import Job
from awsglue.utils import getResolvedOptions
from awsglue.dynamicframe import DynamicFrame
from pyspark.sql import functions as F

# Get job parameters
args = getResolvedOptions(sys.argv, [
    'JOB_NAME',
    'source_table_arn',
    'destination_table',
    'migration_bucket',
    'account_id'
])

# Initialize Glue context
sc = SparkContext()
glueContext = GlueContext(sc)
spark = glueContext.spark_session
job = Job(glueContext)
job.init(args['JOB_NAME'], args)

try:
    print(f"Starting large table migration from {args['source_table_arn']}")
    
    # Use the export connector for reading the source table
    source_dyf = glueContext.create_dynamic_frame.from_options(
        connection_type="dynamodb",
        connection_options={
            "dynamodb.export": "ddb",
            "dynamodb.tableArn": args['source_table_arn'],
            "dynamodb.s3.bucket": args['migration_bucket'],
            "dynamodb.s3.prefix": "export/",
            "dynamodb.s3.bucketOwner": args['account_id'],
            "dynamodb.simplifyDDBJson": True
        }
    )
    
    # Print schema and count for logging
    print("Source table schema:")
    source_dyf.printSchema()
    records_count = source_dyf.count()
    print(f"Total records to migrate: {records_count}")
    print("Shuffling.")

    # Convert DynamicFrame to DataFrame, shuffle, and convert back to DynamicFrame
    df = source_dyf.toDF()
    df = df.orderBy(F.rand())
    shuffled_dyf = DynamicFrame.fromDF(df, glueContext, "shuffled_dyf")

    # Write to destination table with controlled throughput
    print(f"Writing to destination table: {args['destination_table']}")
    glueContext.write_dynamic_frame_from_options(
        frame=shuffled_dyf,
        connection_type="dynamodb",
        connection_options={
            "dynamodb.output.tableName": args['destination_table'],
            "dynamodb.throughput.write.percent": "0.9",  # Higher performance
            "dynamodb.output.retry": "3"  # Retry failed writes
        }
    )

    print(f"Migration completed. {records_count} records processed.")

except Exception as e:
    print(f"Error during migration: {str(e)}")
    raise e

finally:
    # Clean up S3 export if needed (you might want to keep it for verification)
    try:
        import boto3
        s3 = boto3.client('s3')
        # List and delete exported files
        paginator = s3.get_paginator('list_objects_v2')
        for page in paginator.paginate(
            Bucket=args['migration_bucket'],
            Prefix='export/'
        ):
            if 'Contents' in page:
                for obj in page['Contents']:
                    s3.delete_object(
                        Bucket=args['migration_bucket'],
                        Key=obj['Key']
                    )
        print("Cleaned up S3 export files")
    except Exception as cleanup_error:
        print(f"Warning: Error during cleanup: {str(cleanup_error)}")

    # Commit the job
    job.commit()