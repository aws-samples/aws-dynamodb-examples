# NERDS Stack - Basic Project - NodeJS Express React DynamoDB and SAM

The NERDS stack will allow you to bootstrap your work with DynamoDB, you can move from Development to Production very quickly.

This project contains source code and supporting files for a sample application running on Express and NodeJS with Amazon DynamoDB local. It includes the following files and folders:

- `src` - Code for the express application and the APIs.
- `package.json` - Includes all the scripts to work on this project and the pre-requisites.

This application will create a couple of API methods to add and list the ToDos.

## Requirements

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [DynamoDB Local Docker Image](https://hub.docker.com/r/amazon/dynamodb-local)
- [Node v22.3.0](https://nodejs.org/en/blog/release/v22.3.0)
- [AWS JavaScript SDK v3](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/dynamodb/)

## Usage

To start working with this project you need to first run `npm install`.

### Running the tool in conjuntion with the front end.

![Demo](./documentation/Darn-basic-stack.gif)

### DynamoDB local

This application will store all the information in an Amazon DynamoDB local instance, you will experience all the benefits from Amazon DynamoDB in your workstation.

Execute the command `npm run start-db`. If this is the first time running the command your output should look like the one below. Docker will obtain the latest version for you!

```shell
❯ npm run start-db

> basic-backend@0.0.1 start-db
> echo "CID=$(docker run -p $npm_package_config_ddbport:$npm_package_config_ddbport -d amazon/dynamodb-local -jar DynamoDBLocal.jar -sharedDb)" > .ddb_cid

Unable to find image 'amazon/dynamodb-local:latest' locally
latest: Pulling from amazon/dynamodb-local
decbb28a26fa: Pull complete
4b968a8d55bd: Pull complete
4f4fb700ef54: Pull complete
16d147f186fa: Pull complete
Digest: sha256:d7ebddeb60fa418bcda218a6c6a402a58441b2a20d54c9cb1d85fd5194341753
Status: Downloaded newer image for amazon/dynamodb-local:latest
```

If you want to stop DynamoDB local execution you just need to run the command `npm run stop-db`. The long number at the end represents your docker container ID.

```shell
❯ npm run stop-db

> basic-backend@0.0.1 stop-db
> source .ddb_cid && docker stop $CID && rm .ddb_cid

904e9a494f0f09acd027e33d275d3a51a05716f09cc4eace87b778bc3e65e650
```

### Working with DynamoDB tables

This project consists of a To-Do application and you will be storing all the items in a DynamoDB table. First you need to create a `Notes` table, where you will store all your to-dos.

Run the command `npm run create-table`.

```shell
❯ npm run create-table

> basic-backend@0.0.1 create-table
> aws dynamodb create-table --table-name $npm_package_config_ddbtable --attribute-definitions AttributeName=PK,AttributeType=S --key-schema AttributeName=PK,KeyType=HASH --billing-mode PAY_PER_REQUEST --endpoint-url http://$npm_package_config_ddbhost:$npm_package_config_ddbport --no-cli-page

{
    "TableDescription": {
        "AttributeDefinitions": [
            {
                "AttributeName": "PK",
                "AttributeType": "S"
            }
        ],
        "TableName": "Notes",
        "KeySchema": [
            {
                "AttributeName": "PK",
                "KeyType": "HASH"
            }
        ],
        "TableStatus": "ACTIVE",
        "CreationDateTime": "2024-07-29T10:40:09.344000-04:00",
        "ProvisionedThroughput": {
            "LastIncreaseDateTime": "1969-12-31T19:00:00-05:00",
            "LastDecreaseDateTime": "1969-12-31T19:00:00-05:00",
            "NumberOfDecreasesToday": 0,
            "ReadCapacityUnits": 0,
            "WriteCapacityUnits": 0
        },
        "TableSizeBytes": 0,
        "ItemCount": 0,
        "TableArn": "arn:aws:dynamodb:ddblocal:000000000000:table/Notes",
        "BillingModeSummary": {
            "BillingMode": "PAY_PER_REQUEST",
            "LastUpdateToPayPerRequestDateTime": "2024-07-29T10:40:09.344000-04:00"
        },
        "DeletionProtectionEnabled": false
    }
}
```

If you run the command twice by mistake, the second time you will get an error saying that you already have a table called `Notes`.

```shell
❯ npm run create-table

> basic-backend@0.0.1 create-table
> aws dynamodb create-table --table-name $npm_package_config_ddbtable --attribute-definitions AttributeName=PK,AttributeType=S --key-schema AttributeName=PK,KeyType=HASH --billing-mode PAY_PER_REQUEST --endpoint-url http://$npm_package_config_ddbhost:$npm_package_config_ddbport --no-cli-page


An error occurred (ResourceInUseException) when calling the CreateTable operation: Cannot create preexisting table
```

### List all the existing tables

To idenfity which tables you have created execute the command `npm run show-tables`.

```shell
❯ npm run show-tables

> basic-backend@0.0.1 show-tables
> aws dynamodb list-tables --endpoint-url http://$npm_package_config_ddbhost:$npm_package_config_ddbport

{
    "TableNames": [
        "Notes"
    ]
}
```

### Retrieve all the items from one table

To return all the elements from the `Notes` table you can run the command `npm run scan-table`. However if your table is empty you will get this output.

```shell
❯ npm run scan-table

> basic-backend@0.0.1 scan-table
> aws dynamodb scan --table-name $npm_package_config_ddbtable --endpoint-url http://$npm_package_config_ddbhost:$npm_package_config_ddbport

{
    "Items": [],
    "Count": 0,
    "ScannedCount": 0,
    "ConsumedCapacity": null
}
```

### Initialize the backend

Finally to work with the sample express application, included in this project you will need to execute the instruction `npm run start-backend`, this process will start the express application that will be listening at port 3000.

Tip: execute this command in a new terminal

```shell
❯ npm run start-backend

> basic-backend@0.0.1 start-backend
> node src/server.js

Server is running on port 3000
```

## Contributing

As soon as you clone this repository you need to run `pre-commit install` and before pushing any commit you need to run `detect-secrets scan > .secrets.baseline`. Failing to run this command will result in an invalid commit and it will be rejected.
