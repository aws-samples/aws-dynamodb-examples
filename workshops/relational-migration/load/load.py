import boto3
from botocore.config import Config
from botocore.exceptions import ClientError
import mysql.connector
from datetime import datetime, timedelta
import sys
import os
import importlib

preview_only = False

mysql_host = ""
mysql_db = "app_db"
mysql_username = "dbuser"
mysql_password = ""


if "MYSQL_HOST" in os.environ:
    mysql_host = os.environ['MYSQL_HOST']
if "MYSQL_DB" in os.environ:
    mysql_db = os.environ['MYSQL_DB']
if "MYSQL_USERNAME" in os.environ:
    mysql_username = os.environ['MYSQL_USERNAME']
if "MYSQL_PASSWORD" in os.environ:
    mysql_password = os.environ['MYSQL_PASSWORD']

job_file = 'job1.py'
ddb_local = False
ddb_region = 'us-east-2'

if preview_only:
    print('Preview item data without writing to the table')

if len(sys.argv) > 1:
    job_file = sys.argv[1]

spec = importlib.util.spec_from_file_location("hello", "./jobs/" + job_file)
job = importlib.util.module_from_spec(spec)
sys.modules["job"] = job
spec.loader.exec_module(job)

my_config = Config(
    region_name=ddb_region,
    connect_timeout=25, read_timeout=25,
    retries={'total_max_attempts': 3, 'mode': 'standard'}
)


def main(dynamodb=None, mysql_conn=None):
    ddb_table=None
    mysql_conn=None
    mysql_cur=None

    job_info = job.job_info()
    # print(job_info)

    if(job_info['db'] == 'dynamodb'):
        if not dynamodb:
            if ddb_local:
                dynamodb = boto3.client('dynamodb', config=my_config, endpoint_url='http://localhost:8000')
            else:
                dynamodb = boto3.client('dynamodb', config=my_config)
        ddb_table = boto3.resource('dynamodb').Table(job_info['table'])

    if(job_info['db'] == 'mysql'):
        mysql_conn = mysql.connector.connect(
          database=mysql_db,
          user=mysql_username,
          password=mysql_password,
          host=mysql_host
        )

        mysql_cur = mysql_conn.cursor(buffered=True, dictionary=True)

    writes = 0
    errors = 0

    for tick in range(1, job_info['row_count'] + 1):
        row = job.row_maker(tick)

        if(job_info['db'] == 'dynamodb'):
            print('dynamodb row ', row)
            ddb_table.put_item(Item=row)

        if(job_info['db'] == 'mysql'):
            # print('mysql here, row: ', row)
            rowkeys = row.keys()
            rowvals = row.values()
            insert1 = "INSERT INTO " + job_info['table'] + " (" + ','.join(rowkeys) + ") "
            insert1 += "VALUES (" + ("%s," * len(rowkeys))[:-1] + ")"
            insert2 =  list(rowvals)

            if preview_only:
                print(insert2)
            else:
                try:
                    mysql_cur.execute(insert1, insert2)
                    mysql_conn.commit()
                    writes += 1

                except Exception as e:
                    errors += 1
                    print(e)
                    list(rowvals)


    if(job_info['db'] == 'mysql'):
        mysql_cur.close()
        mysql_conn.close()

    print()
    print('load complete for ' + job_file)
    print('writes : ' + str(writes))
    print('errors : ' + str(errors))

if __name__ == "__main__":
    main()


class bcolors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'