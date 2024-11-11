# execute SQL statement, convert results to DynamoDB JSON, write to S3 bucket/folder
#
# aws s3 ls s3://s3-import-demo/migrations/
#

import mysql.connector
import decimal
import datetime
import boto3
import os, sys
import json


# customize sql here or pass in as arg 2
sqlfile = None    # sql = 'SELECT * FROM Products LIMIT 3'
sql = None

table_name = None
s3_path = None

if len(sys.argv) > 1:
    table_name = sys.argv[1]
    sql = "SELECT * FROM " + table_name

else:
    print('pass in table_name as command line arg 1')
    exit()

if len(sys.argv) > 2:
    sqlfile = sys.argv[2]
    s = open(sqlfile, "r")
    sql = s.read()

s3_path = 'migrations/' + table_name + '/'

s3_bucket = 's3-import-demo'
region = 'us-west-2'
items_per_file = 5

mysql_host = ""
mysql_db = "app_db"
mysql_username = "admin"
mysql_password = ""

if "MYSQL_HOST" in os.environ:
    mysql_host = os.environ['MYSQL_HOST']
if "MYSQL_DB" in os.environ:
    mysql_db = os.environ['MYSQL_DB']
if "MYSQL_USERNAME" in os.environ:
    mysql_username = os.environ['MYSQL_USERNAME']
if "MYSQL_PASSWORD" in os.environ:
    mysql_password = os.environ['MYSQL_PASSWORD']


def main():
    mydb = mysql.connector.connect(
      host=mysql_host,
      user=mysql_username,
      password=mysql_password,
      db=mysql_db
    )
    print('Connecting to : ' + mysql_host + ', db: ' + mysql_db)
    print('Running SQL   : \n\n' + sql)
    print()

    cur = mydb.cursor(buffered=True, dictionary=True)

    cur.execute(sql)

    res = cur.fetchall()

    print('Converting query results to DynamoDB JSON & Writing to S3\n')
    rowcount = 0
    filetext = ''
    for row in res:
        if rowcount % items_per_file == 0 and rowcount > 0:
            write_s3(s3_bucket, s3_path, f'data_upto_{rowcount}.json', filetext)
            filetext = ''
        rowcount += 1
        rowtext = '{"Item":{'
        for key in row:
            if row[key] is not None:
                rowtext += parse_attr(key, row[key]) + ','
        rowtext = rowtext[:-1] + '}}'

        filetext += rowtext + '\n'

    write_s3(s3_bucket, s3_path, f'data_upto_{rowcount}.json', filetext)


def write_s3(bucket, path, objname, obj):
    client = boto3.client('s3', region_name=region)
    fullpath = path + objname

    res = client.put_object(
        Body=obj,
        Bucket=bucket,
        Key=fullpath)

    print(f'HTTP {res["ResponseMetadata"]["HTTPStatusCode"]} for S3 object s3://{bucket}/{path}{objname}')

    return 'ok'


def parse_attr(key, value):
    rtype = 'S'
    rvalue = ''
    if isinstance(value, int):
        rvalue = str(value)
        rtype = 'N'

    elif isinstance(value, decimal.Decimal):
        rvalue = str(value)
        rtype = 'N'

    elif isinstance(value, datetime.datetime):
        rvalue = str(value)
        rtype = 'S'

    else:
        rvalue = value
        rtype = 'S'

    return '"' + key + '":{"' + rtype + '":"' + rvalue + '"}'


if __name__ == "__main__":
    main()