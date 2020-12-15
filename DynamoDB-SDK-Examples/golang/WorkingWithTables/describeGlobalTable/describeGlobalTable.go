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

func describeTable() error {
    dynamoDBClient := dynamodb.New(getSession())
    response, err := dynamoDBClient.DescribeGlobalTable(&dynamodb.DescribeGlobalTableInput{
        GlobalTableName: aws.String(tableName),
    })

    if err != nil {
        fmt.Println("Error describing table.", err)
        return err
    }

    fmt.Println(response)
    return nil
}

func describeTableSettings() error {
    dynamoDBClient := dynamodb.New(getSession())
    response, err := dynamoDBClient.DescribeGlobalTableSettings(&dynamodb.DescribeGlobalTableSettingsInput{
        GlobalTableName: aws.String(tableName),
    })

    if err != nil {
        fmt.Println("Error describing table settings.", err)
        return err
    }

    fmt.Println(response)
    return nil
}

func main() {
    fmt.Println("Describing Table ...")
    describeTable()
    describeTableSettings()
    fmt.Println("Finished ...")
}
