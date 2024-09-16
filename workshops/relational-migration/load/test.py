import boto3
from botocore.config import Config
from botocore.exceptions import ClientError
import mysql.connector
from datetime import datetime, timedelta
import sys
import importlib

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


def main(dynamodb=None, mysql_conn=None):

    ddb_table=None
    mysql_conn=None
    mysql_cur=None

    mysql_conn = mysql.connector.connect(
      database=mysql_db,
      user=mysql_username,
      password=mysql_password,
      host=mysql_host
    )
    mysql_cur = mysql_conn.cursor(buffered=True, dictionary=True)
    mysql_cur.execute("SELECT cust_id, name, credit_rating FROM Customers")
    result = mysql_cur.fetchall()

    for x in result:
      print(x)

    mysql_cur.close()
    mysql_conn.close()


if __name__ == "__main__":
    main()
