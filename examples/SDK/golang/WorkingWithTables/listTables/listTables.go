package main

import (
    "github.com/aws/aws-sdk-go/aws"
    "github.com/aws/aws-sdk-go/aws/session"
    "github.com/aws/aws-sdk-go/service/dynamodb"
    "fmt"
)

var tableName = "Music"
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

func listTables(tableName string) error {
    dynamoDBClient := dynamodb.New(getSession())
    response, err := dynamoDBClient.ListTables(&dynamodb.ListTablesInput{})

    if err != nil {
        return err
    }

    fmt.Println(response)
    return nil
}

func main() {
    fmt.Println("Listing Tables ...")
    listTables(tableName)
    fmt.Println("Finished ...")
}
