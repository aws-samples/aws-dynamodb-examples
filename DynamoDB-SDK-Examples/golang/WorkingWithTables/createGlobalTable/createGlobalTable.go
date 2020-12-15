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

    replicationGroup := []*dynamodb.Replica{
        {
            RegionName: aws.String(awsRegion),
        },
    }

    _, err := dynamoDBClient.CreateGlobalTable(&dynamodb.CreateGlobalTableInput{
        GlobalTableName:  &table,
        ReplicationGroup: replicationGroup,
    })

    if err != nil {
        fmt.Println("Got error setting up Global Table.", err)
        return err
    }

    err = dynamoDBClient.WaitUntilTableExists(&dynamodb.DescribeTableInput{
        TableName: aws.String(table),
    });

    if err != nil {
        fmt.Println("Got error calling CreateGlobalTable.")
        return err
    }

    return nil
}

func main() {
    fmt.Println("Creating Global Table ...")
    createTable()
    fmt.Println("Finished ...")
}
