package main

import (
    "github.com/aws/aws-sdk-go/aws"
    "github.com/aws/aws-sdk-go/aws/session"
    "github.com/aws/aws-sdk-go/service/applicationautoscaling"
    "fmt"
)

var awsRegion      = "us-west-2"
var readDimension  = "dynamodb:table:ReadCapacityUnits"
var resourceID     = fmt.Sprintf("%s%s", "table/", tableName)
var roleARN        = "PUT_YOUR_ROLE_ARN_HERE"
var tableName      = "Music"
var writeDimension = "dynamodb:table:WriteCapacityUnits"

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

func registerScalableTarget(
    autoscalingClient *applicationautoscaling.ApplicationAutoScaling,
    dimension string,
) {
    input := &applicationautoscaling.RegisterScalableTargetInput{
        MaxCapacity:       aws.Int64(500),
        MinCapacity:       aws.Int64(1),
        ResourceId:        aws.String(resourceID),
        RoleARN:           aws.String(roleARN),
        ScalableDimension: aws.String(dimension),
        ServiceNamespace:  aws.String("dynamodb"),
    }
    autoscalingClient.RegisterScalableTarget(input)
}

func registerAutoscaling() {
    autoscalingClient := applicationautoscaling.New(getSession())

    registerScalableTarget(autoscalingClient, readDimension)
    fmt.Println("Read scalable target registered ...")

    registerScalableTarget(autoscalingClient, writeDimension)
    fmt.Println("Write scalable target registered ...")
}

func main() {
    fmt.Println("Updating autoscaling settings ...")
    registerAutoscaling()
    fmt.Println("Finished ...")
}
