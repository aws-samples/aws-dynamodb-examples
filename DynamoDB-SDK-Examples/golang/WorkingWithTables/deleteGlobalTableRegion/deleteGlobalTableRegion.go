package main

import (
    "github.com/aws/aws-sdk-go/aws"
    "github.com/aws/aws-sdk-go/aws/session"
    "github.com/aws/aws-sdk-go/service/dynamodb"
    "fmt"
)

var table     = "Music"
var awsRegion = "ap-northeast-2"

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

func updateTable() error {
    dynamoDBClient := dynamodb.New(getSession())

    replicaUpdates := []*dynamodb.ReplicaUpdate{
        {
            Delete: &dynamodb.DeleteReplicaAction{
                RegionName: aws.String(awsRegion),
            },
        },
    }

    _, err := dynamoDBClient.UpdateGlobalTable(&dynamodb.UpdateGlobalTableInput{
        GlobalTableName: &table,
        ReplicaUpdates: replicaUpdates,
    })

    if err != nil {
        fmt.Println("Got error updating Global Table.", err)
        return err
    }

    return nil
}

func main() {
    fmt.Println("Creating Global Table ...")
    updateTable()
    fmt.Println("Finished ...")
}
