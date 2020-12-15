package main

import (
    "github.com/aws/aws-sdk-go/aws"
    "github.com/aws/aws-sdk-go/aws/session"
    "github.com/aws/aws-sdk-go/service/dynamodb"
    "fmt"
)

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

func describeLimits() error {
    dynamoDBClient := dynamodb.New(getSession())
    response, err := dynamoDBClient.DescribeLimits(&dynamodb.DescribeLimitsInput{})

    if err != nil {
        return err
    }

    fmt.Println("Table Limits ...", response)
    return nil
}

func main() {
    fmt.Println("Describing DynamoDB Limits ...")
    describeLimits()
    fmt.Println("Finished ...")
}
