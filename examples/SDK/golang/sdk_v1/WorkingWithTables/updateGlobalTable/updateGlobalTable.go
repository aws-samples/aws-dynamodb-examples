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

func updateTable() error {
    dynamoDBClient := dynamodb.New(getSession())

    replicaUpdates := []*dynamodb.ReplicaUpdate{
        {
            Create: &dynamodb.CreateReplicaAction{
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

func updateTableSettings() error {
    dynamoDBClient := dynamodb.New(getSession())

    _, err := dynamoDBClient.UpdateGlobalTableSettings(&dynamodb.UpdateGlobalTableSettingsInput{
        GlobalTableName: &table,
        GlobalTableProvisionedWriteCapacityUnits: aws.Int64(10),
    })

    if err != nil {
        fmt.Println("Got error updating Global Table Settings.", err)
        return err
    }

    return nil
}

func main() {
    fmt.Println("Creating Global Table ...")
    updateTable()
    updateTableSettings()
    fmt.Println("Finished ...")
}
