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

    mysql_cur.execute(request)
    result = mysql_cur.fetchall()

    return result

def desc_view(view):

    print('view ' + view)
    request = "SELECT VIEW_DEFINITION FROM INFORMATION_SCHEMA.VIEWS "
    request += "WHERE TABLE_NAME = '" + view + "'"

    request = "SHOW CREATE VIEW " + view + " "

    mysql_cur.execute(request)
    result = mysql_cur.fetchall()
    if len(result) == 0:
        return {'VIEW_DEFINITION':view + ' not found'}

    view_raw_code = result # result[0]['VIEW_DEFINITION']

    return {'VIEW_DEFINITION': view_raw_code}

def desc_view2(view):

    request = "SELECT VIEW_DEFINITION FROM INFORMATION_SCHEMA.VIEWS "
    request += "WHERE TABLE_NAME = '" + view + "'"

    mysql_cur.execute(request)
    result = mysql_cur.fetchall()

    if len(result) == 0:
        return {'VIEW_DEFINITION':view + ' not found'}

    view_raw_code = result[0]['VIEW_DEFINITION']
    view_parsed = {'metadata': {}, 'code': ''}

    blocks = view_raw_code.split(' union all ')
    counter = 0
    for block in blocks:
        counter += 1
        if len(blocks) == 1:
            view_parsed = parse_format_view(block)
        else:
            view_parsed['code'] += parse_format_view(block)['code']
            if len(blocks) > counter:
                view_parsed['code'] += '\n\nUNION ALL\n\n'

    print(json.dumps(view_parsed['metadata'], indent=2))
    print()
    return {'VIEW_DEFINITION': view_parsed['code']}


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

def parse_format_view(rcode): # raw code
    fcode = '' # formatted code
    returned = {
        'code': '',
        'metadata': {
                'cols': [],
                'source_view': '',
                'aliases': [],
                'where_equalities': [],
                'range_expressions': []
            }
    }

    where_position = 0
    limit_position = 0
    where_part = ''
    limit_part = ''

    from_position = rcode.find(' from ')
    where_position = rcode[from_position:].find(' where ')
    limit_position = rcode[from_position:].find(' limit ')
    if where_position == -1:
        where_position = 99999
    if limit_position == -1:
        limit_position = 99999
    from_end_position = min(where_position, limit_position)

    select_part = rcode[7:from_position]
    from_part = rcode[from_position+5:][:from_end_position-5]

    if where_position < 99999:
        where_part = '\nWHERE\n  ' + rcode[from_position:][where_position+7:limit_position]

    if limit_position < 99999:
        limit_part = '\nLIMIT ' + rcode[from_position:][limit_position+7:] # [1:][:-1]

    tables = []
    table_aliases = []

    db_name = from_part[from_part.find('`')+1:from_part.find('.')-1]

    select_part = select_part.replace('`' + db_name + '`.', '')
    from_part = from_part.replace('`' + db_name + '`.', '')
    where_part = where_part.replace('`' + db_name + '`.', '')

    table_count = from_part.count('join') + 1

    col_list = []
    cols = select_part.split(',')
    select_part_formatted = ''
    c = 0
    for col in cols:
        c += 1
        col_part = col.split('AS')[0]
        as_part = col.split('AS')[1].strip()
        as_value = as_part[1:][:-1]
        attrs = col_part.split('.')
        select_part_formatted += '  '
        if table_count > 1:
            select_part_formatted += strip_quotes(attrs[0]) + '.'
        col_name = strip_quotes(attrs[1])
        cname = ''
        col_name_length = len(col_name.split('.'))
        if col_name_length > 1:
            cname = col_name[1]
        else:
            cname = col_name
        if cname == strip_quotes(as_part):
            select_part_formatted += col_name + ',\n'
        else:
            select_part_formatted += col_name + ' ' * (15 - len(col_name)) + ' AS ' + as_part + ',\n'

        returned['metadata']['cols'].append(col_name)

        if c == len(cols):
            select_part_formatted = select_part_formatted[:-2]


    from_part = from_part.replace('`', '').strip()
    where_part = where_part.replace('`', '')

    from_part_parts = from_part.split('join')

    if table_count == 1:  # view of a single view
        sv = from_part_parts[0].replace('(', '').split(' ')[0]
        returned['metadata']['source_view'] = sv

    from_part = from_part.replace(' join ','\n    JOIN ').replace(' on(', ' ON (')

    where_parts = where_part.split(' and ')
    for wpart in where_parts:
        wp = wpart.replace('WHERE', '').strip()
        print('wp: ' + wp)

    where_part = where_part.replace(' and ', '\n    AND\n  ')
    where_part = where_part.replace(' or ', '\n    OR\n  ')


    fcode = 'SELECT \n' + select_part_formatted + '\nFROM\n  ' + from_part
    fcode += where_part + limit_part
    # fcode = ''

    returned['code'] = rcode

    return returned


def strip_quotes(str):
    strst = str.strip()
    if strst[0] == '`':
        if strst.find(' ') == -1:
            return strst[1:][:-1]
    return strst


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