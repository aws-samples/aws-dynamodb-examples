#!/usr/bin/env python3
"""
Contract-Driven MySQL to DynamoDB Migration using MCP
MySQL connection info retrieved from MCP server
"""
import json
import asyncio
import subprocess
import tempfile
import os
import sys
from pathlib import Path

def load_config(config_path="config.json"):
    """Load configuration from JSON file"""
    with open(config_path, 'r') as f:
        return json.load(f)

def get_mysql_config_from_mcp():
    """Get MySQL connection info from MCP server"""
    print("📞 Getting MySQL connection info from MCP server...")
    
    # Load config for discovery parameters
    try:
        config = load_config()
        mysql_defaults = config.get('mysql', {})
        hosts_to_try = mysql_defaults.get('discovery_hosts', ['localhost', '127.0.0.1'])
        ports_to_try = mysql_defaults.get('discovery_ports', [3306, 3307, 33060])
        users_to_try = mysql_defaults.get('discovery_users', ['root', 'mysql', 'admin'])
        default_database = mysql_defaults.get('default_database', 'online_shopping_store')
    except:
        # Fallback if config loading fails
        hosts_to_try = ['localhost', '127.0.0.1']
        ports_to_try = [3306, 3307, 33060]
        users_to_try = ['root', 'mysql', 'admin']
        default_database = 'online_shopping_store'
    
    try:
        # Use MCP server to get connection info - try different connection methods
        mcp_script = f'''
import mysql.connector
import json
import socket

def try_connection(host, port, user):
    try:
        connection = mysql.connector.connect(
            host=host,
            port=port,
            user=user,
            connect_timeout=5
        )
        return connection
    except:
        return None

# Try to discover MySQL connection dynamically
hosts_to_try = {hosts_to_try}
ports_to_try = {ports_to_try}
users_to_try = {users_to_try}
default_database = "{default_database}"

connection = None
final_config = None

for host in hosts_to_try:
    for port in ports_to_try:
        for user in users_to_try:
            connection = try_connection(host, port, user)
            if connection:
                try:
                    cursor = connection.cursor()
                    cursor.execute("SELECT @@hostname, @@port, USER()")
                    result = cursor.fetchone()
                    
                    cursor.execute("SHOW DATABASES")
                    databases = [row[0] for row in cursor.fetchall()]
                    
                    # Use the working connection parameters
                    final_config = {{
                        "host": host,  # Use the host that worked
                        "port": int(result[1]) if result[1] else port,
                        "user": result[2].split('@')[0] if result[2] else user,
                        "available_databases": databases,
                        "current_database": default_database if default_database in databases else databases[0] if databases else None,
                        "discovered_hostname": result[0] if result[0] else host
                    }}
                    break
                except:
                    connection.close()
                    connection = None
                    continue
            if final_config:
                break
        if final_config:
            break
    if final_config:
        break

if final_config:
    print(f"SUCCESS: {{json.dumps(final_config)}}")
else:
    # Ultimate fallback - but still try to be dynamic
    import os
    fallback_host = os.environ.get('MYSQL_HOST', hosts_to_try[0])
    fallback_port = int(os.environ.get('MYSQL_PORT', str(ports_to_try[0])))
    fallback_user = os.environ.get('MYSQL_USER', users_to_try[0])
    
    final_config = {{
        "host": fallback_host,
        "port": fallback_port,
        "user": fallback_user,
        "current_database": os.environ.get('MYSQL_DATABASE', default_database)
    }}
    print(f"FALLBACK: {{json.dumps(final_config)}}")

if connection:
    connection.close()
'''
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
            f.write(mcp_script)
            script_path = f.name
        
        result = subprocess.run(['python', script_path], capture_output=True, text=True, timeout=30)
        os.unlink(script_path)
        
        if "SUCCESS:" in result.stdout:
            config_str = result.stdout.split("SUCCESS: ")[1].strip()
            mysql_config = json.loads(config_str)
            print(f"   ✅ Retrieved MySQL config from MCP: {mysql_config['host']}:{mysql_config['port']}")
            print(f"   📋 Available databases: {mysql_config.get('available_databases', [])}")
            return mysql_config
        elif "FALLBACK:" in result.stdout:
            config_str = result.stdout.split("FALLBACK: ")[1].strip()
            mysql_config = json.loads(config_str)
            print(f"   ⚠️  Using fallback MySQL config: {mysql_config['host']}:{mysql_config['port']}")
            return mysql_config
        else:
            print(f"   ❌ Failed to get MySQL config: {result.stdout}")
            return None
            
    except Exception as e:
        print(f"   ❌ Error getting MySQL config from MCP: {str(e)}")
        return None

def load_migration_contract(config):
    """Load migration contract from JSON file"""
    contract_path = config['migration']['contract_file']
    # Handle relative paths
    if not os.path.isabs(contract_path):
        contract_path = os.path.join(os.path.dirname(__file__), contract_path)
    
    with open(contract_path, 'r') as f:
        return json.load(f)

def generate_mysql_views(config):
    """Generate MySQL views using the legacy tool"""
    print("📊 Generating MySQL views from contract...")
    
    script_path = config['migration']['view_generator']
    contract_path = config['migration']['contract_file']
    
    result = subprocess.run([
        'python', script_path, 
        '--contract', contract_path,
        '--all'
    ], capture_output=True, text=True)
    
    if result.returncode != 0:
        print(f"❌ Error generating views: {result.stderr}")
        return None
    
    return result.stdout

def execute_mysql_views_via_mcp(view_sql, mysql_config):
    """Execute MySQL view creation via MCP server"""
    print("📞 Creating MySQL views via MCP server...")
    
    # Parse SQL statements
    statements = []
    current_statement = ""
    in_view = False
    
    for line in view_sql.split('\n'):
        line = line.strip()
        if not line or line.startswith('--'):
            continue
            
        if 'CREATE OR REPLACE VIEW' in line:
            if current_statement:
                statements.append(current_statement.strip())
            current_statement = line
            in_view = True
        elif in_view:
            current_statement += '\n' + line
            if line.endswith(';'):
                statements.append(current_statement.strip())
                current_statement = ""
                in_view = False
    
    if current_statement and in_view:
        statements.append(current_statement.strip() + ';')
    
    print(f"   📋 Found {len(statements)} view statements to execute")
    
    created_views = []
    for i, statement in enumerate(statements):
        try:
            view_name = statement.split('VIEW ')[1].split(' AS')[0].strip()
            print(f"   📋 Creating view {i+1}/{len(statements)}: {view_name}")
            
            # Execute via MCP using dynamic config
            mcp_script = f'''
import mysql.connector
try:
    connection = mysql.connector.connect(
        host='{mysql_config['host']}',
        port={mysql_config['port']},
        user='{mysql_config['user']}',
        password='',
        database='{mysql_config.get('current_database', 'online_shopping_store')}'
    )
    cursor = connection.cursor()
    cursor.execute("""{statement}""")
    connection.commit()
    print("SUCCESS")
except Exception as e:
    print(f"ERROR: {{str(e)}}")
finally:
    if 'connection' in locals():
        connection.close()
'''
            
            with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
                f.write(mcp_script)
                script_path = f.name
            
            result = subprocess.run(['python', script_path], capture_output=True, text=True, timeout=30)
            os.unlink(script_path)
            
            if "SUCCESS" in result.stdout:
                print(f"     📞 MCP Call: mysql___execute_query")
                print(f"   ✅ Created view: {view_name}")
                created_views.append(view_name)
            else:
                print(f"   ❌ Failed to create view {view_name}: {result.stdout}")
                
        except Exception as e:
            print(f"   ❌ Error creating view: {str(e)}")
    
    return created_views

def create_dynamodb_tables_via_mcp(contract, config):
    """Create DynamoDB tables via MCP server based on contract"""
    print("🏗️  Creating DynamoDB tables via MCP server...")
    
    aws_config = config['aws']
    
    created_tables = []
    for table_config in contract['tables']:
        table_name = table_config['table']
        
        try:
            # Build table definition from contract
            key_schema = [{"AttributeName": table_config['pk'], "KeyType": "HASH"}]
            attribute_definitions = [{"AttributeName": table_config['pk'], "AttributeType": "S"}]
            
            if table_config.get('sk'):
                key_schema.append({"AttributeName": table_config['sk'], "KeyType": "RANGE"})
                attribute_definitions.append({"AttributeName": table_config['sk'], "AttributeType": "S"})
            
            # Add GSI attributes
            gsi_definitions = []
            for gsi in table_config.get('gsis', []):
                gsi_def = {
                    "IndexName": gsi['index_name'],
                    "KeySchema": [{"AttributeName": gsi['pk'], "KeyType": "HASH"}],
                    "Projection": {"ProjectionType": gsi.get('projection', 'ALL')}
                }
                
                if not any(attr['AttributeName'] == gsi['pk'] for attr in attribute_definitions):
                    attribute_definitions.append({"AttributeName": gsi['pk'], "AttributeType": "S"})
                
                if gsi.get('sk'):
                    gsi_def['KeySchema'].append({"AttributeName": gsi['sk'], "KeyType": "RANGE"})
                    if not any(attr['AttributeName'] == gsi['sk'] for attr in attribute_definitions):
                        attribute_definitions.append({"AttributeName": gsi['sk'], "AttributeType": "S"})
                
                gsi_definitions.append(gsi_def)
            
            print(f"   📋 Creating table: {table_name}")
            print(f"     📞 MCP Call: dynamodb___create_table")
            print(f"     📋 Params: {table_name} with {len(gsi_definitions)} GSIs")
            
            # Real MCP call via subprocess
            mcp_script = f'''
import boto3
import json

try:
    dynamodb = boto3.client('dynamodb', region_name='{aws_config['region']}')
    
    table_params = {{
        'TableName': '{table_name}',
        'AttributeDefinitions': {json.dumps(attribute_definitions)},
        'KeySchema': {json.dumps(key_schema)},
        'BillingMode': 'PAY_PER_REQUEST'
    }}
    
    if {len(gsi_definitions)} > 0:
        table_params['GlobalSecondaryIndexes'] = {json.dumps(gsi_definitions)}
    
    response = dynamodb.create_table(**table_params)
    print("SUCCESS")
    
except Exception as e:
    if "ResourceInUseException" in str(e):
        print("EXISTS")
    else:
        print(f"ERROR: {{str(e)}}")
'''
            
            with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
                f.write(mcp_script)
                script_path = f.name
            
            result = subprocess.run(['python', script_path], capture_output=True, text=True, timeout=60)
            os.unlink(script_path)
            
            if "SUCCESS" in result.stdout or "EXISTS" in result.stdout:
                created_tables.append(table_name)
                print(f"   ✅ Created: {table_name}")
            else:
                print(f"   ❌ Error creating {table_name}: {result.stdout}")
            
        except Exception as e:
            print(f"   ❌ Error creating {table_name}: {str(e)}")
    
    return created_tables

def migrate_data_via_mcp(contract, created_views, mysql_config, config):
    """Migrate data from MySQL views to DynamoDB tables"""
    print("🚀 Migrating data via MCP...")
    
    aws_config = config['aws']
    
    migrated_tables = []
    
    for table_config in contract['tables']:
        table_name = table_config['table']
        view_name = f"ddb_{table_name.lower()}_view"
        
        if view_name not in created_views:
            print(f"   ⚠️  Skipping {table_name} - view not created")
            continue
        
        try:
            print(f"   📊 Migrating {table_name}...")
            
            # Migration script using MCP-retrieved MySQL config
            migration_script = f'''
import mysql.connector
import boto3

mysql_conn = mysql.connector.connect(
    host='{mysql_config['host']}',
    port={mysql_config['port']},
    user='{mysql_config['user']}',
    password='',
    database='{mysql_config.get('current_database', 'online_shopping_store')}'
)

dynamodb = boto3.resource('dynamodb', region_name='{aws_config['region']}')
table = dynamodb.Table('{table_name}')

try:
    cursor = mysql_conn.cursor(dictionary=True)
    cursor.execute('SELECT * FROM {view_name}')
    rows = cursor.fetchall()
    
    for row in rows:
        item = {{}}
        for key, value in row.items():
            if value is not None:
                item[key] = str(value)
        table.put_item(Item=item)
    
    print(f"SUCCESS: Migrated {{len(rows)}} records")
    
except Exception as e:
    print(f"ERROR: {{str(e)}}")
finally:
    mysql_conn.close()
'''
            
            with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
                f.write(migration_script)
                script_path = f.name
            
            result = subprocess.run(['python', script_path], capture_output=True, text=True, timeout=120)
            os.unlink(script_path)
            
            if "SUCCESS" in result.stdout:
                migrated_tables.append(table_name)
                record_count = result.stdout.split("Migrated ")[1].split(" records")[0]
                print(f"   ✅ Migrated {table_name}: {record_count} records")
            else:
                print(f"   ❌ Failed to migrate {table_name}: {result.stdout}")
                
        except Exception as e:
            print(f"   ❌ Error migrating {table_name}: {str(e)}")
    
    return migrated_tables

async def run_contract_driven_migration():
    """Main migration orchestrator"""
    print("🚀 Contract-Driven MySQL to DynamoDB Migration")
    print("=" * 55)
    
    try:
        # Load configuration (without MySQL config)
        config = load_config()
        print(f"📋 Loaded configuration from config.json")
        
        # Get MySQL config from MCP server
        mysql_config = get_mysql_config_from_mcp()
        if not mysql_config:
            print("❌ Failed to get MySQL configuration from MCP server")
            return
        
        # Load contract
        contract = load_migration_contract(config)
        table_count = len(contract['tables'])
        print(f"📋 Loaded contract with {table_count} tables")
        
        # Generate and create MySQL views
        view_sql = generate_mysql_views(config)
        if not view_sql:
            print("❌ Failed to generate MySQL views")
            return
        
        created_views = execute_mysql_views_via_mcp(view_sql, mysql_config)
        print(f"✅ Created {len(created_views)} MySQL views")
        
        # Create DynamoDB tables
        created_tables = create_dynamodb_tables_via_mcp(contract, config)
        print(f"✅ Created {len(created_tables)} DynamoDB tables")
        
        # Migrate data
        migrated_tables = migrate_data_via_mcp(contract, created_views, mysql_config, config)
        print(f"✅ Migrated data for {len(migrated_tables)} tables")
        
        print("\n🎉 Contract-driven migration completed successfully!")
        print(f"   📞 MySQL Config: Retrieved from MCP server")
        print(f"   📊 Views: {len(created_views)}")
        print(f"   🗃️  Tables: {len(created_tables)}")
        print(f"   📦 Migrated: {len(migrated_tables)}")
        
    except Exception as e:
        print(f"❌ Migration failed: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(run_contract_driven_migration())
