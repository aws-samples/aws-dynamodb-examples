# Demo Script

## Before Demo Setup

* Verify MySQL is set up and running locally
* Verify Q CLI is set up and logged in with Pro subscription
* Verify MySQL instance is populated with data
* Verify Docker set up

To install MCP server, add to MCP JSON:

```json
{
  "mcpServers": {
    "ddb-migrate": {
       "command": "uv",
      "args": [
        "run",
        "--with",
        "mcp[cli]",
        "--with", 
        "mysql-connector-python",
        "mcp",
        "run",
        "/tmp/modernizer-workspace/AWS-GenAI-DB-modernizer/dynamodb/ddb-migrate/server.py"
      ],
      "env": {},
      "timeout": 120000
    }
  }
}
```

```shell
$ mkdir /tmp/modernizer-workspace
$ cd !$
$ git clone ssh://git.amazon.com/pkg/AWS-GenAI-DB-modernizer
$ git clone -b mysql-with-tests ssh://git.amazon.com/pkg/DynamoDBOnlineShopApp
```

Follow the README in ddb-migrate to build the MCP server.  To install it, add to Q's mcp.json:

```json
{
  "mcpServers": {
    "ddb-migrate": {
       "command": "uv",
      "args": [
        "run",
        "--with",
        "mcp[cli]",
        "--with", 
        "mysql-connector-python",
        "mcp",
        "run",
        "/tmp/modernizer-workspace/AWS-GenAI-DB-modernizer/dynamodb/ddb-migrate/server.py"
      ],
      "env": {},
      "timeout": 120000
    }
  }
}
```

Now load Q:

```shell
$ q
> /tools
[...]
ddb_migrate (MCP):
- ddb_migrate___analyze_logs                                          * not trusted
- ddb_migrate___connect_database                                      * not trusted
- ddb_migrate___extract_schema                                        * not trusted
```

Make sure to stop any test data generation against the source database.

## Intro

* Where we start
* Where we end

## Analyze source MySQL database and design data model

```shell
> Using the ddb-migrate MCP server tools, follow the prompt AWS-GenAI-DB-modernizer/dynamodb/prompts/01_mysql_migration_modeler_prompt.md
```

* Ask to run the benchmark first when prompted
* Show choices presented and how to compare
* Identify preferred option

## Make application code changes

```shell
> Run through AWS-GenAI-DB-modernizer/dynamodb/prompts/02_dal_indirection.script.md using DynamoDBOnlineShopApp as the codebase path
> Run through AWS-GenAI-DB-modernizer/dynamodb/prompts/03_generate_dal_code.script.md using DynamoDBOnlineShopApp as the codebase path, and the file Stage3_DataModel.md as the data model description
> Run through AWS-GenAI-DB-modernizer/dynamodb/prompts/04_generate_feature_flag.md using DynamoDBOnlineShopApp as the codebase path, and the file Stage3_DataModel.md as the data model description
```

* Show starting state
* Add indirection layer
* Add DynamoDB implementation (with dual-write logic)

## Create tables in AWS, test out ported app against DDB without any data migrated

```shell
> Run through the AWS-GenAI-DB-modernizer/dynamodb/prompts/05_table_deployment.md prompt to deploy a CFN stack with the tables from the desired data model
```

* Create empty tables following the data model
* Run app against DynamoDB only
* Show user registration flow, empty product list
* Live debug HTML issues if needed
* Show tables populated with data from our activity
* Delete and recreate tables to prepare for migration

## Show Dual Write

* Enable feature flag for dual write
* Run through product checkout flow to show data from source database is used
* Show tables populated with new data from order

## Backfill data from source database

```shell
> Run through the AWS-GenAI-DB-modernizer/dynamodb/prompts/06_etl_deployment.md prompt to deploy a CFN stack with the tables from the desired data model
> Run the Python script AWS-GenAI-DB-modernizer/dynamodb/tools/generate_mysql_views.py to generate database views in MySQL using the contract JSON file in the current directory
```

* TODO: Either write script to connect to DB and run, or have the user login and run the commands.  Owner: Andy
* Run script to create views in source DB
* Run script to backfill data
* Explain approach, emphasize conditional writes
* Show data landed in target tables

## Show Dual Read

* Now we can compare reads between the source database and target
* Enable feature flag for dual read
* Run through same product checkout flow, show logs indicating reads are equivalent

## Talk through cutover process

* Talk through cutting over reads, validating behavior, and then cutting over writes
* After cutting over writes, the source database will be missing some writes, making rollback more difficult

## Conclusion
