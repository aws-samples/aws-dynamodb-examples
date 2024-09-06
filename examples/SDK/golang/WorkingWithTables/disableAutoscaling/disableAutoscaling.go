package main

import (
    "github.com/aws/aws-sdk-go/aws"
    "github.com/aws/aws-sdk-go/aws/session"
    "github.com/aws/aws-sdk-go/service/applicationautoscaling"
    "fmt"
)

var awsRegion      = "us-west-2"
var policyName     = fmt.Sprintf("%s_%s", tableName, "TableScalingPolicy")
var tableName      = "Music"
var readDimension  = "dynamodb:table:ReadCapacityUnits"
var resourceID     = fmt.Sprintf("%s/%s", "table", tableName)
var roleARN        = "UPDATE_YOUR_ROLE_ARN_HERE"
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
    resourceID string,
    roleARN string,
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

func deleteScalingPolicy(
    autoscalingClient *applicationautoscaling.ApplicationAutoScaling,
    dimension string,
) {
    input := &applicationautoscaling.DeleteScalingPolicyInput{
        PolicyName:        aws.String(policyName),
        ResourceId:        aws.String(resourceID),
        ServiceNamespace:  aws.String("dynamodb"),
        ScalableDimension: aws.String(dimension),
    }
    autoscalingClient.DeleteScalingPolicy(input)
}

func deregisterScalableTarget(
    autoscalingClient *applicationautoscaling.ApplicationAutoScaling,
    dimension string,
) {
    input := &applicationautoscaling.DeregisterScalableTargetInput{
        ResourceId:        aws.String(resourceID),
        ServiceNamespace:  aws.String("dynamodb"),
        ScalableDimension: aws.String(dimension),
    }
    autoscalingClient.DeregisterScalableTarget(input)
}

func disableAutoscaling() {
    autoscalingClient := applicationautoscaling.New(getSession())

    deleteScalingPolicy(autoscalingClient, readDimension)
    fmt.Println("Read scaling policy deleted ...")

    deleteScalingPolicy(autoscalingClient, writeDimension)
    fmt.Println("Write scaling policy deleted ...")

    deregisterScalableTarget(autoscalingClient, readDimension)
    fmt.Println("Write scalable target registered ...")

    deregisterScalableTarget(autoscalingClient, writeDimension)
    fmt.Println("Write scalable target registered ...")
}

func main() {
    fmt.Println("Updating table to disable autoscaling ...")
    disableAutoscaling()
    fmt.Println("Finished ...")
}
