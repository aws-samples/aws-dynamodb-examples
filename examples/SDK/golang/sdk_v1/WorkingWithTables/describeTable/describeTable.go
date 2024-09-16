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

func describeTable(tableName string) error {
    dynamoDBClient := dynamodb.New(getSession())
    response, err := dynamoDBClient.DescribeTable(&dynamodb.DescribeTableInput{
        TableName: aws.String(tableName),
    })

    if err != nil {
        return err
    }

    fmt.Println(response)
    return nil
}

func main() {
    fmt.Println("Describing Table ...")
    describeTable(tableName)
    fmt.Println("Finished ...")
}
