# NERDS Stack - NodeJS Express React DynamoDB and SAM

## Enhanced example

This example includes additional DynamoDB functionality, you will work with a table with a Partition Key and a Sort Key that will allow you to run more elegant queries.

We will be working with an ehnahced task example where you will retrieve the tasks for a given user, and optional by priority.

This project contains source code and supporting files for a sample application running on Express and NodeJS with Amazon DynamoDB local. It includes the following files and folders:

![enhanced-recording](./documentation/enhanced-backend.gif)

## Folder Description

- `src` - Code for the express application and the APIs, and sample script to populate table.
- `package.json` - Includes all the scripts to work on this project and the pre-requisites.

This application will create a couple of API methods to add and list the ToDos.

## Requirements

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [DynamoDB Local Docker Image](https://hub.docker.com/r/amazon/dynamodb-local)
- [Node v22.3.0](https://nodejs.org/en/blog/release/v22.3.0)
- [AWS JavaScript SDK v3](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/dynamodb/)

## Usage

### DynamoDB local

This application will store all the information in an Amazon DynamoDB local instance, you will experience all the benefits from Amazon DynamoDB in your workstation.

Execute the command `npm run start-db`. If this is the first time running the command your output should look like the one below. Docker will obtain the latest version for you!

To start working with this project you need to first run `npm install`.

```bash
❯ npm run start-db

> enhanced-backend@0.0.1 start-db
> echo "CID=$(docker run -p $npm_package_config_ddbport:$npm_package_config_ddbport -d amazon/dynamodb-local -jar DynamoDBLocal.jar -sharedDb)" > .ddb_cid
```

If you want to stop DynamoDB local execution you just need to run the command `npm run stop-db`. The long number at the end represents your docker container ID.

```shell
❯ npm run stop-db

> enhanced-backend@0.0.1 stop-db
> source .ddb_cid && docker stop $CID && rm .ddb_cid

904e9a494f0f09acd027e33d275d3a51a05716f09cc4eace87b778bc3e65e650
```

### Working with DynamoDB tables

This project consists of a To-Do application and you will be storing all the items in a DynamoDB table. First you need to create a `recipes-table` table, where you will store all your to-dos.

Run the command command. `npm run create-recipes-table`

```bash
❯ npm run create-recipes-table

> enhanced-backend@0.0.1 create-recipes-table
> aws dynamodb create-table --table-name $npm_package_config_ddbEnhancedTable --attribute-definitions AttributeName=PK,AttributeType=S AttributeName=SK,AttributeType=S --key-schema AttributeName=PK,KeyType=HASH AttributeName=SK,KeyType=RANGE --billing-mode PAY_PER_REQUEST --endpoint-url http://${npm_package_config_ddbhost}:${npm_package_config_ddbport} --no-cli-page

{
    "TableDescription": {
        "AttributeDefinitions": [
            {
                "AttributeName": "PK",
                "AttributeType": "S"
            },
            {
                "AttributeName": "SK",
                "AttributeType": "S"
            }
        ],
        "TableName": "social-recipes",
        "KeySchema": [
            {
                "AttributeName": "PK",
                "KeyType": "HASH"
            },
            {
                "AttributeName": "SK",
                "KeyType": "RANGE"
            }
        ],
        "TableStatus": "ACTIVE",
        "CreationDateTime": "2024-09-25T13:38:11.310000-04:00",
        "ProvisionedThroughput": {
            "LastIncreaseDateTime": "1969-12-31T19:00:00-05:00",
            "LastDecreaseDateTime": "1969-12-31T19:00:00-05:00",
            "NumberOfDecreasesToday": 0,
            "ReadCapacityUnits": 0,
            "WriteCapacityUnits": 0
        },
        "TableSizeBytes": 0,
        "ItemCount": 0,
        "TableArn": "arn:aws:dynamodb:ddblocal:000000000000:table/social-recipes",
        "BillingModeSummary": {
            "BillingMode": "PAY_PER_REQUEST",
            "LastUpdateToPayPerRequestDateTime": "2024-09-25T13:38:11.310000-04:00"
        },
        "DeletionProtectionEnabled": false
    }
}
```

### List all the existing tables

To idenfity which tables you have created execute the command `npm run show-tables`.

```bash
❯ npm run show-tables

> enhanced-backend@0.0.1 show-tables
> aws dynamodb list-tables --endpoint-url http://$npm_package_config_ddbhost:$npm_package_config_ddbport --no-cli-page

{
    "TableNames": [
        "social-recipes"
    ]
}
```

### Retrieve all the items from one table

List all the elements in the `social-recipes` table (Scan a table). `npm run scan-recipes`. However if your table is empty you will get this output.

```bash
❯ npm run scan-recipes

> enhanced-backend@0.0.1 scan-recipes
> aws dynamodb scan --table-name $npm_package_config_ddbEnhancedTable --endpoint-url http://$npm_package_config_ddbhost:$npm_package_config_ddbport --no-cli-page

{
    "Items": [],
    "Count": 0,
    "ScannedCount": 0,
    "ConsumedCapacity": null
}
```

### Populate sample data

Populate the `social-recipes` table with sample fake data:

```bash
❯ npm run populate-recipe-table

> enhanced-backend@0.0.1 populate-recipe-table
> node src/populate.js

Successfully inserted batch of 7 items
All items have been processed
```

Scan the table one more time `npm run scan-recipes`

```bash
❯ npm run scan-recipes

> enhanced-backend@0.0.1 scan-recipes
> aws dynamodb scan --table-name $npm_package_config_ddbEnhancedTable --endpoint-url http://$npm_package_config_ddbhost:$npm_package_config_ddbport --no-cli-page

{
    "Items": [
        {
            "taskDate": {
                "S": "2024-09-21T10:35:39"
            },
            "SK": {
                "S": "TASK#0#2024-09-21T10:35:39#hUkIVS7H3BKlEmQTNvNOe"
            },
            "taskPriority": {
                "S": "0"
            },
            "description": {
                "S": "Corvina is the best for a seviche"
            },
            "PK": {
                "S": "USER#4Rl17WTewD6aa1-k73cBJ"
            },
            "title": {
                "S": "Get some Corvina"
            },
            "userId": {
                "S": "4Rl17WTewD6aa1-k73cBJ"
            },
            "taskId": {
                "S": "hUkIVS7H3BKlEmQTNvNOe"
            }
        },
        ...
        ...
        {
            "SK": {
                "S": "USER#4Rl17WTewD6aa1-k73cBJ"
            },
            "Priorities": {
                "L": [
                    {
                        "N": "0"
                    },
                    {
                        "N": "1"
                    },
                    {
                        "N": "2"
                    },
                    {
                        "N": "3"
                    }
                ]
            },
            "PK": {
                "S": "USER#4Rl17WTewD6aa1-k73cBJ"
            },
            "userId": {
                "S": "4Rl17WTewD6aa1-k73cBJ"
            },
            "Name": {
                "S": "John Doe"
            }
        }
    ],
    "Count": 7,
    "ScannedCount": 7,
    "ConsumedCapacity": null
}

```

### Initialize the backend

Finally to work with the sample express application, included in this project you will need to execute the instruction `npm run start-backend`, this process will start the express application that will be listening at port 3000.

Tip: execute this command in a new terminal

```shell
❯ npm run start-backend

> enhanced-backend@0.0.1 start-backend
> node src/server.js

Server is running on port 3000
```

## Contributing

As soon as you clone this repository you need to run `pre-commit install` and before pushing any commit you need to run `detect-secrets scan > .secrets.baseline`. Failing to run this command will result in an invalid commit and it will be rejected.
