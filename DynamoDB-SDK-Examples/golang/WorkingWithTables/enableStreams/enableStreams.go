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

func enableStreams() error {
    dynamoDBClient := dynamodb.New(getSession())

    _, err := dynamoDBClient.UpdateTable(&dynamodb.UpdateTableInput{
        StreamSpecification: &dynamodb.StreamSpecification{
            StreamEnabled:  aws.Bool(true),
            //'NEW_IMAGE'|'OLD_IMAGE'|'NEW_AND_OLD_IMAGES'|'KEYS_ONLY'
            StreamViewType: aws.String("NEW_AND_OLD_IMAGES"),
        },
        TableName: aws.String(tableName),
    })

    if err != nil {
        fmt.Println("Error enabling streams", err)
        return err
    }

    return nil
}

func main() {
    fmt.Println("Enabling streams in table ...")
    enableStreams()
    fmt.Println("Finished ...")
}
