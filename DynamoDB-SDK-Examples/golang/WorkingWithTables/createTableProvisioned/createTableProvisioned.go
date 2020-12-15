package main

import (
    "github.com/aws/aws-sdk-go/aws"
    "github.com/aws/aws-sdk-go/aws/session"
    "github.com/aws/aws-sdk-go/service/dynamodb"
    "fmt"
)

var table     = "Music"
var awsRegion = "us-west-2"

func getSession() (*session.Session) {
    sess := session.Must(session.NewSessionWithOptions(session.Options{
        SharedConfigState: session.SharedConfigEnable,
        // Provide SDK Config options, such as Region and Endpoint
        Config: aws.Config{
            Region: aws.String(awsRegion),
        },
    }))

    return sess
}

func createTable() error {
    dynamoDBClient := dynamodb.New(getSession())

    attributeDefinitions := []*dynamodb.AttributeDefinition{
        {
            AttributeName: aws.String("Artist"),
            AttributeType: aws.String("S"),
        },
        {
            AttributeName: aws.String("SongTitle"),
            AttributeType: aws.String("S"),
        },
    }

    keySchema := []*dynamodb.KeySchemaElement{
        {
            AttributeName: aws.String("Artist"),
            KeyType:       aws.String("HASH"), // Partition Key
        },
        {
            AttributeName: aws.String("SongTitle"),
            KeyType:       aws.String("RANGE"), // Sort Key
        },
    }

    provisionedThroughput := &dynamodb.ProvisionedThroughput{
        ReadCapacityUnits:  aws.Int64(10),
        WriteCapacityUnits: aws.Int64(10),
    }

    _, err := dynamoDBClient.CreateTable(&dynamodb.CreateTableInput{
        AttributeDefinitions:  attributeDefinitions,
        KeySchema:             keySchema,
        ProvisionedThroughput: provisionedThroughput,
        TableName:             &table,
    })

    if err != nil {
        return err
    }

    err = dynamoDBClient.WaitUntilTableExists(&dynamodb.DescribeTableInput{
        TableName: aws.String(table),
    });

    if err != nil {
        fmt.Println("Got error calling CreateTable:")
        return err
    }

    return nil
}

func main() {
    fmt.Println("Creating Provisioned Table ...")
    createTable()
    fmt.Println("Finished ...")
}
