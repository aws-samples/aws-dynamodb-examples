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
    'destination_table_arn'
])


# Initialize Glue context
sc = SparkContext()
glueContext = GlueContext(sc)
spark = glueContext.spark_session
TASKS_PER_EXECUTOR = int(spark.sparkContext.getConf().get("spark.executor.cores"))
NUM_EXECUTORS = int(spark.sparkContext.getConf().get("spark.executor.instances"))
SPLITS_STR = str(NUM_EXECUTORS * TASKS_PER_EXECUTOR)
job = Job(glueContext)
job.init(args['JOB_NAME'], args)


try:
    # Read from source DynamoDB table using native connector
    source_dyf = glueContext.create_dynamic_frame.from_options(
        connection_type="dynamodb",
        connection_options={
            "dynamodb.input.tableName": args['source_table_arn'],
            "dynamodb.throughput.read.percent": "1.0",
            "dynamodb.splits": SPLITS_STR
        }
    )
    records_count = source_dyf.count()
    print(f"Total records to migrate: {records_count}")
    print("Shuffling.")
    # Convert to DataFrame for more control
    df = source_dyf.toDF()

    # Calculate number of partitions based on data size and available resources
    num_partitions = max(200, records_count // 100000)  # Minimum 200 partitions, or 1 partition per 100,000 records

    print(f"Shuffling data into {num_partitions} partitions")

    # Add a random UUID and use it for partitioning
    df_shuffled = df.withColumn("random_id", F.rand()) \
                    .repartition(num_partitions, "random_id") \
                    .drop("random_id")

    # Convert back to DynamicFrame
    shuffled_dyf = DynamicFrame.fromDF(df_shuffled, glueContext, "shuffled_dyf")

    # Write to destination table
    glueContext.write_dynamic_frame_from_options(
        frame=shuffled_dyf,
        connection_type="dynamodb",
        connection_options={
            "dynamodb.output.tableName": args['destination_table_arn'],
            "dynamodb.throughput.write.percent": "1.0"
        }
    )

    # Print some statistics
    print(f"Records processed: {records_count}")

except Exception as e:
    print(f"Error during migration: {str(e)}")
    raise e

finally:
    # Commit the job
    job.commit()