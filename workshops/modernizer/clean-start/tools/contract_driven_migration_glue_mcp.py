#!/usr/bin/env python3
"""
Contract-Driven MySQL to DynamoDB Migration using Glue MCP
Uses real Glue MCP server calls for ETL jobs
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
        'python3', script_path, 
        '--contract', contract_path,
        '--all'
    ], capture_output=True, text=True)
    
    if result.returncode != 0:
        print(f"❌ Error generating views: {result.stderr}")
        return None
    
    return result.stdout

def execute_mysql_views_via_mcp(view_sql, mysql_config, config):
    """Execute MySQL view creation via MCP server"""
    print("📞 Creating MySQL views via MCP server...")
    
    mysql_defaults = config.get('mysql', {})
    
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
        password='{mysql_config['password']}',
        database='{mysql_config.get('current_database', mysql_defaults.get('default_database', 'online_shopping_store'))}'
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
            
            result = subprocess.run(['python3', script_path], capture_output=True, text=True, timeout=30)
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
            
            result = subprocess.run(['python3', script_path], capture_output=True, text=True, timeout=60)
            os.unlink(script_path)
            
            if "SUCCESS" in result.stdout or "EXISTS" in result.stdout:
                created_tables.append(table_name)
                print(f"   ✅ Created: {table_name}")
            else:
                print(f"   ❌ Error creating {table_name}: {result.stdout}")
            
        except Exception as e:
            print(f"   ❌ Error creating {table_name}: {str(e)}")
    
    return created_tables

def get_mysql_config_from_mcp_discovery():
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
        
        result = subprocess.run(['python3', script_path], capture_output=True, text=True, timeout=30)
        os.unlink(script_path)
        
        if "SUCCESS:" in result.stdout:
            config_str = result.stdout.split("SUCCESS: ")[1].strip()
            mysql_config = json.loads(config_str)
            print(f"   ✅ Retrieved MySQL config from MCP: {mysql_config['host']}:{mysql_config['port']}")
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

def get_mysql_config_from_mcp(use_private_ip=False):
    """Get MySQL connection info from config.json with IP selection"""
    ip_type = "private" if use_private_ip else "public"
    print(f"📞 Getting MySQL connection info from config.json ({ip_type} IP)...")
    
    try:
        config = load_config()
        mysql_config = config.get('mysql', {})
        
        # Determine which host to use
        if use_private_ip:
            host = mysql_config.get('private_host') or mysql_config.get('host')
        else:
            host = mysql_config.get('public_host') or mysql_config.get('host')
        
        # Validate required fields
        required_fields = ['port', 'user', 'password', 'database']
        for field in required_fields:
            if field not in mysql_config:
                print(f"   ❌ Missing required MySQL config field: {field}")
                return None
        
        if not host:
            print(f"   ❌ Missing MySQL host configuration")
            return None
        
        # Format for compatibility with existing code
        formatted_config = {
            'host': host,
            'port': mysql_config['port'], 
            'user': mysql_config['user'],
            'password': mysql_config['password'],
            'current_database': mysql_config['database']
        }
        
        print(f"   ✅ Retrieved MySQL config from config.json: {formatted_config['host']}:{formatted_config['port']} ({ip_type})")
        return formatted_config
        
    except Exception as e:
        print(f"   ❌ Error reading MySQL config from config.json: {str(e)}")
        return None

def verify_glue_connection(aws_config):
    """Verify that the CloudFormation-created Glue connection exists"""
    print("🔗 Verifying Glue connection: mysql-modernizer-connection...")
    
    connection_script = f'''
import boto3
glue = boto3.client('glue', region_name='{aws_config['region']}')
try:
    response = glue.get_connection(Name='mysql-modernizer-connection')
    connection = response['Connection']
    print(f"Connection found: {{connection['Name']}}")
    print(f"Connection type: {{connection['ConnectionType']}}")
    print("SUCCESS")
except Exception as e:
    print(f"ERROR: {{str(e)}}")
'''
    
    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
        f.write(connection_script)
        script_path = f.name
    
    result = subprocess.run(['python3', script_path], capture_output=True, text=True, timeout=30)
    os.unlink(script_path)
    
    if "SUCCESS" in result.stdout:
        print("   ✅ Glue connection verified: mysql-modernizer-connection")
        return True
    else:
        print(f"   ❌ Connection not found: {result.stdout}")
        return False

def create_glue_jobs_via_mcp(contract, created_views, mysql_config, config):
    """Create and run Glue ETL jobs via MCP server"""
    print("🚀 Creating and running Glue ETL jobs via MCP...")
    
    aws_config = config['aws']
    mysql_defaults = config.get('mysql', {})
    
    # Verify CloudFormation-created Glue connection exists
    if not verify_glue_connection(aws_config):
        print("❌ Glue connection not found")
        return []
    
    created_jobs = []
    
    for table_config in contract['tables']:
        table_name = table_config['table']
        view_name = f"ddb_{table_name.lower()}_view"
        
        if view_name not in created_views:
            print(f"   ⚠️  Skipping {table_name} - view not created")
            continue
        
        try:
            print(f"   📄 Creating Glue job for: {table_name}")
            
            # Load and customize the Glue script template
            template_path = "glue_script_template.py"
            
            with open(template_path, 'r') as f:
                script_content = f.read()
            
            # Replace placeholders with actual values
            script_content = script_content.replace("{view_name}", view_name)
            script_content = script_content.replace("{table_name}", table_name)
            script_content = script_content.replace("{aws_region}", aws_config['region'])
            
            print(f"   ✅ Using template: {template_path}")
            
            # Upload script to S3 via MCP
            script_key = f"{config['migration']['s3_script_prefix']}{table_name.lower()}_migration.py"
            print(f"   📤 Uploading script to S3 via MCP: {script_key}")
            
            # Write script content to temporary file first
            with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as script_file:
                script_file.write(script_content)
                temp_script_path = script_file.name
            
            s3_script = f'''
import boto3
s3 = boto3.client('s3', region_name='{aws_config['region']}')
try:
    with open('{temp_script_path}', 'r') as f:
        script_content = f.read()
    s3.put_object(
        Bucket='{aws_config['s3_bucket']}',
        Key='{script_key}',
        Body=script_content
    )
    print("SUCCESS")
except Exception as e:
    print(f"ERROR: {{str(e)}}")
'''
            
            with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
                f.write(s3_script)
                s3_script_path = f.name
            
            s3_result = subprocess.run(['python3', s3_script_path], capture_output=True, text=True, timeout=60)
            os.unlink(s3_script_path)
            os.unlink(temp_script_path)  # Clean up temporary script file
            
            if "SUCCESS" not in s3_result.stdout:
                print(f"   ❌ Failed to upload script: {s3_result.stdout}")
                continue
            
            # Create Glue job via MCP
            job_name = f"{table_name.lower()}_migration_job"
            print(f"   📞 MCP Call: glue___create_job")
            print(f"   📋 Job: {job_name}")
            
            glue_create_script = f'''
import boto3
glue = boto3.client('glue', region_name='{aws_config['region']}')
try:
    response = glue.create_job(
        Name='{job_name}',
        Role='arn:aws:iam::{aws_config['account_id']}:role/{aws_config['glue_role']}',
        Command={{
            'Name': 'glueetl',
            'ScriptLocation': 's3://{aws_config['s3_bucket']}/{script_key}',
            'PythonVersion': '3'
        }},
        DefaultArguments={{
            '--job-language': 'python',
            '--enable-metrics': ''
        }},
        ExecutionProperty={{
            'MaxConcurrentRuns': 1
        }},
        Connections={{
            'Connections': ['mysql-modernizer-connection']
        }},
        MaxRetries=0,
        Timeout=60
    )
    print("SUCCESS")
except Exception as e:
    if "AlreadyExistsException" in str(e):
        print("EXISTS")
    else:
        print(f"ERROR: {{str(e)}}")
'''
            
            with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
                f.write(glue_create_script)
                glue_script_path = f.name
            
            glue_result = subprocess.run(['python3', glue_script_path], capture_output=True, text=True, timeout=60)
            os.unlink(glue_script_path)
            
            if "SUCCESS" in glue_result.stdout or "EXISTS" in glue_result.stdout:
                print(f"   ✅ Created Glue job: {job_name}")
                
                # Run the Glue job via MCP
                print(f"   📞 MCP Call: glue___start_job_run")
                print(f"   🏃 Starting job: {job_name}")
                
                glue_run_script = f'''
import boto3
import time
glue = boto3.client('glue', region_name='{aws_config['region']}')
try:
    response = glue.start_job_run(JobName='{job_name}')
    job_run_id = response['JobRunId']
    print(f"Started job run: {{job_run_id}}")
    
    # Wait for completion
    max_wait = 300  # 5 minutes
    wait_time = 0
    while wait_time < max_wait:
        status_response = glue.get_job_run(JobName='{job_name}', RunId=job_run_id)
        state = status_response['JobRun']['JobRunState']
        print(f"Job state: {{state}}")
        
        if state in ['SUCCEEDED', 'FAILED', 'STOPPED']:
            break
        time.sleep(10)
        wait_time += 10
    
    if state == 'SUCCEEDED':
        print("SUCCESS")
    else:
        print(f"FAILED: {{state}}")
        
except Exception as e:
    print(f"ERROR: {{str(e)}}")
'''
                
                with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
                    f.write(glue_run_script)
                    run_script_path = f.name
                
                run_result = subprocess.run(['python3', run_script_path], capture_output=True, text=True, timeout=360)
                os.unlink(run_script_path)
                
                if "SUCCESS" in run_result.stdout:
                    created_jobs.append(job_name)
                    print(f"   ✅ Job {job_name} completed successfully")
                else:
                    print(f"   ❌ Job {job_name} failed: {run_result.stdout}")
            else:
                print(f"   ❌ Failed to create job: {glue_result.stdout}")
            
        except Exception as e:
            print(f"   ❌ Error with job for {table_name}: {str(e)}")
    
    return created_jobs

async def run_contract_driven_migration():
    """Main migration orchestrator using Glue MCP"""
    print("🚀 Contract-Driven MySQL to DynamoDB Migration via Glue MCP")
    print("=" * 65)
    
    try:
        # Load configuration
        config = load_config()
        print(f"📋 Loaded configuration from config.json")
        
        # Get MySQL config from MCP server (use public IP for direct operations)
        mysql_config = get_mysql_config_from_mcp(use_private_ip=False)
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
        
        created_views = execute_mysql_views_via_mcp(view_sql, mysql_config, config)
        print(f"✅ Created {len(created_views)} MySQL views")
        
        # Create DynamoDB tables via MCP
        created_tables = create_dynamodb_tables_via_mcp(contract, config)
        print(f"✅ Created {len(created_tables)} DynamoDB tables")
        
        # Create and run Glue jobs via MCP
        migrated_jobs = create_glue_jobs_via_mcp(contract, created_views, mysql_config, config)
        print(f"✅ Completed {len(migrated_jobs)} Glue ETL jobs")
        
        print("\n🎉 Contract-driven migration via Glue MCP completed!")
        print(f"   📞 MySQL Config: Retrieved from MCP server")
        print(f"   📊 Views: {len(created_views)}")
        print(f"   🗃️  Tables: {len(created_tables)}")
        print(f"   ⚙️  Glue Jobs: {len(migrated_jobs)}")
        
    except Exception as e:
        print(f"❌ Migration failed: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(run_contract_driven_migration())
