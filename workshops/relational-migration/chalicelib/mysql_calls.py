# Implementation of application's MySQL database calls
import os
import time, datetime
import mysql.connector
import json
import re

mysql_host = ""
mysql_db = "app_db"
mysql_username = "admin"
mysql_password = ""

return_limit = 20


if "MYSQL_HOST" in os.environ:
    mysql_host = os.environ['MYSQL_HOST']
if "MYSQL_DB" in os.environ:
    mysql_db = os.environ['MYSQL_DB']
if "MYSQL_USERNAME" in os.environ:
    mysql_username = os.environ['MYSQL_USERNAME']
if "MYSQL_PASSWORD" in os.environ:
    mysql_password = os.environ['MYSQL_PASSWORD']

mysql_conn = None

try:
    mysql_conn = mysql.connector.connect(
      database=mysql_db,
      user=mysql_username,
      password=mysql_password,
      host=mysql_host
    )
    mysql_conn.autocommit = True

except Exception as error:
  print("Error: " + str(error))
  exit(1)


mysql_cur = mysql_conn.cursor(buffered=True, dictionary=True)

def engine():
    return "MySQL"


def list_tables():
    request = "SELECT TABLE_NAME, TABLE_TYPE FROM information_schema.tables "
    request += "WHERE table_schema = '" + mysql_db + "' "
    mysql_cur.execute(request)
    result = mysql_cur.fetchall()

    tables = []
    views = []
    for t in result:
        if t['TABLE_TYPE'] == 'BASE TABLE':
            tables.append(t['TABLE_NAME'])
        if t['TABLE_TYPE'] == 'VIEW':
            views.append(t['TABLE_NAME'])

    return {'Tables': tables, 'Views': views}


def runsql(sql):
    stmt = remove_comments(sql['sql'])
    first_word = stmt.strip().split()[0].upper()

    if first_word == 'SELECT':
        dataset = []
        try:
            mysql_cur.execute(sql['sql'])
            result = mysql_cur.fetchall()
            dataset = format_sql_dataset(result)

        except Exception as e:
            return({"status": "Error " + str(e)})

        return dataset

    else:
        try:
            mysql_cur.execute(sql['sql'])
            rows = mysql_cur.rowcount
            if rows > 0:
                return({"status": str(rows) + " row(s) written"})
            else:
                return({"status": "done"})

        except Exception as e:
            return({"status": "Error " + str(e)})


def desc_table(table):

    request = "SELECT 'TABLE' AS 'INFO_TYPE', NULL AS INDEX_NAME, COLUMN_NAME, NULL AS SEQ_IN_INDEX, DATA_TYPE, COLUMN_TYPE, NULL AS REFERENCED_TABLE_NAME, NULL AS REFERENCED_COLUMN_NAME "
    request += "FROM INFORMATION_SCHEMA.COLUMNS WHERE table_schema = '" + mysql_db + "' "
    request += "AND table_name = '" + table + "' "
    request += "UNION ALL "
    request += "SELECT 'INDEX' AS 'INFO_TYPE', INDEX_NAME, COLUMN_NAME, SEQ_IN_INDEX, NULL AS DATA_TYPE, NULL AS COLUMN_TYPE, NULL AS REFERENCED_TABLE_NAME, NULL AS REFERENCED_COLUMN_NAME "
    request += "FROM INFORMATION_SCHEMA.STATISTICS "
    request += "WHERE INDEX_TYPE = 'BTREE' "
    request += "AND TABLE_SCHEMA = '" + mysql_db + "' AND TABLE_NAME = '" + table + "'"
    request += "UNION ALL "
    request += "SELECT 'FOREIGN_KEY' AS 'INFO_TYPE', CONSTRAINT_NAME AS INDEX_NAME, COLUMN_NAME, NULL AS SEQ_IN_INDEX, NULL AS DATA_TYPE, NULL AS COLUMN_TYPE, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME "
    request += "FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE "
    request += "WHERE CONSTRAINT_NAME != 'PRIMARY' "
    request += "AND TABLE_SCHEMA = '" + mysql_db + "' AND TABLE_NAME = '" + table + "';"

    # print(request)

    mysql_cur.execute(request)
    result = mysql_cur.fetchall()

    return result


def scan_table(table):
    limit = 100
    request = "SELECT * "
    request += "FROM " + mysql_db + "." + table + " "
    request += "LIMIT " + str(limit)

    mysql_cur.execute(request)
    result = mysql_cur.fetchall()
    dataset = format_sql_dataset(result)

    return dataset


def query(table, request):

    keyList = list(request['queryRequest']['queryConditions'].keys())
    sql_condition = keyList[0] + ' = %s'

    if len(keyList) > 1:
        sql_condition += ' AND ' + keyList[1] + ' = %s'

    key_vals = list(request['queryRequest']['queryConditions'].values())

    query_stmt = 'SELECT * FROM ' + table + ' WHERE ' + sql_condition

    mysql_cur.execute(query_stmt, key_vals)
    result = mysql_cur.fetchall()
    dataset = format_sql_dataset(result)

    return dataset


def get_record(table, request):

    keyList = list(request['Key'].keys())
    sql_condition = keyList[0] + ' = %s'

    if len(keyList) > 1:
        sql_condition += ' AND ' + keyList[1] + ' = %s'

    key_vals = list(request['Key'].values())

    get_stmt = 'SELECT * FROM ' + table + ' WHERE ' + sql_condition

    mysql_cur.execute(get_stmt, key_vals)
    result = mysql_cur.fetchall()
    dataset = format_sql_dataset(result)

    return dataset


def new_record(table, record):
    insert_stmt = 'INSERT INTO ' + table + ' '

    insert_stmt += '(' + ', '.join(list(record)) + ') '
    # If some elements in names aren't strings, use print(', '.join(map(str,name))) instead.
    insert_stmt += 'VALUES (' + ', '.join(["%s"] * len(list(record))) + ') '
    insert_values = list(record.values())

    try:
        mysql_cur.execute(insert_stmt, insert_values)

    except mysql.connector.IntegrityError as ie:
        return({"status": "IntegrityError " + str(ie)})

    return({"status":mysql_cur.rowcount})


def update_record(table, request):

    keyList = list(request['Key'].keys())
    delete_condition = keyList[0] + ' = %s'

    if len(keyList) > 1:
        delete_condition += ' AND ' + keyList[1] + ' = %s'

    key_vals = list(request['Key'].values())

    update_attributes = list(request['updateAttributes'])
    ua_keys = list(request['updateAttributes'].keys())
    ua_vals = list(request['updateAttributes'].values())

    vals = ua_vals + key_vals

    update_stmt = 'UPDATE ' + table + ' SET '

    for ua_key in ua_keys:
        update_stmt += ua_key + ' = %s, '
    update_stmt = update_stmt[:-2] + ' '

    update_stmt += 'WHERE ' + delete_condition

    print(update_stmt)
    print(vals)

    mysql_cur.execute(update_stmt, vals)

    return({"status": mysql_cur.rowcount})


def delete_record(table, request):
    recordKey = request['Key']

    keyList = list(recordKey.keys())
    deleteCondition = keyList[0] + ' = %s'

    if len(keyList) > 1:
        deleteCondition += ' AND ' + keyList[1] + ' = %s'

    key_vals = list(recordKey.values())

    delete_stmt = 'DELETE FROM ' + table + ' '
    delete_stmt += 'WHERE ' + deleteCondition

    try:
        mysql_cur.execute(delete_stmt, key_vals)

    except Exception as e:
        return({"status": "Error " + str(e)})

    else:
        return({"status":mysql_cur.rowcount})

def format_sql_dataset(dataset):

    formatted_dataset = []
    for index, row in enumerate(dataset):
        formatted_row = {}
        for index2, column_name in enumerate(row.keys()):
            if isinstance(row[column_name], datetime.datetime):
                formatted_row[column_name] = row[column_name].isoformat().replace('T',' ')
            else:
                formatted_row[column_name] = row[column_name]
        formatted_dataset.append(formatted_row)
    return(formatted_dataset)


def remove_comments(sql):
    # Remove single-line comments
    sql = re.sub(r'--.*', '', sql)
    # Remove multi-line comments
    sql = re.sub(r'/\*.*?\*/', '', sql, flags=re.DOTALL)
    return sql