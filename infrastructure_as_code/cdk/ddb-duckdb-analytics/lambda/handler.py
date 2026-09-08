"""DuckDB query endpoint over an S3 Tables (Apache Iceberg) catalog.

The DuckDB connection and the Iceberg catalog ATTACH happen at module
load, so warm invocations pay neither extension loading nor catalog
setup. Credentials come from the Lambda execution role through the
DuckDB aws extension's credential chain.

The endpoint accepts arbitrary SQL and is protected by two layers:
IAM authorization on the function URL (only principals with
lambda:InvokeFunctionUrl can reach it), and a locked-down DuckDB
configuration (no local file access, no extension loading, catalog
attached read-only) so a query cannot touch anything except the
Iceberg tables.
"""

import base64
import json
import math
import os

import duckdb

TABLE_BUCKET_ARN = os.environ["TABLE_BUCKET_ARN"]
EXTENSION_DIR = os.environ.get("DUCKDB_EXTENSION_DIR", "/opt/duckdb_extensions")

# Cap the response size: Lambda function URLs limit non-streaming
# responses to 6 MB, so unbounded SELECTs must be truncated.
MAX_ROWS = int(os.environ.get("MAX_ROWS", "10000"))

con = duckdb.connect()
con.execute(f"SET extension_directory = '{EXTENSION_DIR}'")
con.execute("SET home_directory = '/tmp'")
con.execute("SET temp_directory = '/tmp/duckdb_spill'")
con.execute("LOAD httpfs")
con.execute("LOAD aws")
con.execute("LOAD avro")
con.execute("LOAD iceberg")
con.execute("CREATE SECRET aws_creds (TYPE s3, PROVIDER credential_chain)")
con.execute(
    f"ATTACH '{TABLE_BUCKET_ARN}' AS analytics "
    "(TYPE iceberg, ENDPOINT_TYPE s3_tables, READ_ONLY)"
)

# Lock the engine down after setup: queries must not read or write the
# local filesystem, load further extensions, or change these settings.
con.execute("SET disabled_filesystems = 'LocalFileSystem'")
con.execute("SET autoinstall_known_extensions = false")
con.execute("SET autoload_known_extensions = false")
con.execute("SET allow_community_extensions = false")
con.execute("SET lock_configuration = true")


def handler(event, _context):
    body = event.get("body") or "{}"
    if event.get("isBase64Encoded"):
        body = base64.b64decode(body).decode("utf-8")

    try:
        request = json.loads(body)
    except json.JSONDecodeError:
        return _response(400, {"error": 'Body must be JSON: {"sql": "..."}'})

    sql = request.get("sql")
    if not sql or not isinstance(sql, str):
        return _response(400, {"error": "Missing 'sql' key"})

    try:
        result = con.execute(sql)
        columns = (
            [desc[0] for desc in result.description] if result.description else []
        )
        rows = result.fetchmany(MAX_ROWS)
        truncated = len(rows) == MAX_ROWS and result.fetchone() is not None
    except duckdb.Error as exc:
        # A failed statement can leave an explicitly opened transaction
        # aborted on this shared connection; roll it back so the next
        # warm invocation starts clean.
        try:
            con.execute("ROLLBACK")
        except duckdb.Error:
            pass
        return _response(400, {"error": str(exc)})

    return _response(
        200,
        {
            "columns": columns,
            "rows": [[_jsonable(v) for v in row] for row in rows],
            "row_count": len(rows),
            "truncated": truncated,
        },
    )


def _jsonable(value):
    # NaN and Infinity are not valid JSON; json.dumps would emit literal
    # NaN/Infinity tokens that strict parsers reject.
    if isinstance(value, float) and not math.isfinite(value):
        return str(value)
    if isinstance(value, (str, int, float, bool)) or value is None:
        return value
    return str(value)


def _response(status, payload):
    return {
        "statusCode": status,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(payload, default=str),
    }
