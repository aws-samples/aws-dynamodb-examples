package main

import (
    "github.com/aws/aws-sdk-go/aws"
    "github.com/aws/aws-sdk-go/aws/session"
    "github.com/aws/aws-sdk-go/service/iam"
    "github.com/aws/aws-sdk-go/service/applicationautoscaling"
    "encoding/json"
    "fmt"
)

// StatementEntry will dictate what this policy allows or doesn't allow.
type StatementEntry struct {
    Action   []string
    Effect   string
    Resource string
}

// PrincipalEntry will dictate what this policy allows or doesn't allow.
type PrincipalEntry struct {
    Service []string
}

// PrinciplaStatementEntry will dictate what this policy allows or doesn't allow.
type PrinciplaStatementEntry struct {
    Action    []string
    Effect    string
    Principal PrincipalEntry
}

// AssumePolicyDocument is our definition of our policies to be uploaded to IAM.
type AssumePolicyDocument struct {
    Statement []StatementEntry
    Version   string
}

// PolicyDocument is our definition of our policies to be uploaded to IAM.
type PolicyDocument struct {
    Statement []PrinciplaStatementEntry
    Version   string
}

var awsRegion      = "us-west-2"
var policyName     = fmt.Sprintf("%s_%s", tableName, "TableScalingPolicy")
var resourceID     = fmt.Sprintf("%s%s", "table/", tableName)
var readDimension  = "dynamodb:table:ReadCapacityUnits"
var readMetric     = "DynamoDBReadCapacityUtilization"
var roleName       = fmt.Sprintf("%s_%s", tableName, "TableScalingRole")
var tableName      = "Music"
var writeDimension = "dynamodb:table:WriteCapacityUnits"
var writeMetric    = "DynamoDBWriteCapacityUtilization"

func getPolicyDocument() (string, error) {
    policy := AssumePolicyDocument{
        Version: "2012-10-17",
        Statement: [] StatementEntry{
            StatementEntry{
                Effect: "Allow",
                Action: []string{
                    "dynamodb:DescribeTable",
                    "dynamodb:UpdateTable",
                },
                Resource: "*",
            },
            StatementEntry{
                Effect: "Allow",
                Action: []string{
                    "cloudwatch:PutMetricAlarm",
                    "cloudwatch:DescribeAlarms",
                    "cloudwatch:GetMetricStatistics",
                    "cloudwatch:SetAlarmState",
                    "cloudwatch:DeleteAlarms",
                },
                Resource: "*",
            },
        },
    }

    marshalledPolicy, err := json.Marshal(&policy)

    if err != nil {
        return "", err
    }

    return string(marshalledPolicy), nil
}

func getAssumeRolePolicyDocument() (string, error) {
    policy := PolicyDocument{
        Version: "2012-10-17",
        Statement: []PrinciplaStatementEntry {
            PrinciplaStatementEntry{
                Effect: "Allow",
                Action: []string{
                    "sts:AssumeRole",
                },
                Principal: PrincipalEntry{
                    Service: []string{
                        "ec2.amazonaws.com",
                    },
                },
            },
        },
    }

    marshalledPolicy, err := json.Marshal(&policy)

    if err != nil {
        return "", err
    }

    return string(marshalledPolicy), nil
}

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

func createRole(iamClient *iam.IAM) (*iam.CreateRoleOutput, error) {
    policy, err := getAssumeRolePolicyDocument()

    if err != nil {
        fmt.Println("Error creating Assume Role Policy Document")
        return nil, err
    }

    roleOutput, err := iamClient.CreateRole(&iam.CreateRoleInput{
        AssumeRolePolicyDocument: aws.String(policy),
        Path:                     aws.String("/"),
        RoleName:                 &roleName,
    })

    if err != nil {
        fmt.Println("Error creating IAM Role", err)
        return nil, err
    }

    fmt.Println("Role created ...")
	return roleOutput, nil
}

func createPolicy(iamClient *iam.IAM) (string, error) {
    policyConfig, err := getPolicyDocument()

    if err != nil {
        fmt.Println("Error creating Policy Document", err)
        return "", err
    }

    policy, err := iamClient.CreatePolicy(&iam.CreatePolicyInput{
        PolicyDocument: aws.String(policyConfig),
        PolicyName:     aws.String(policyName),
    })

    if err != nil {
        fmt.Println("Error creating Policy Document")
        return "", err
    }

    policyArn := *policy.Policy.Arn

    fmt.Println("Policy created ...")
    return policyArn, nil
}

func attachPolicy(
    iamClient *iam.IAM,
    policyArn string,
    roleName string,
) {
    iamClient.AttachRolePolicy(&iam.AttachRolePolicyInput{
        RoleName: aws.String(roleName),
        PolicyArn: aws.String(policyArn),
    })
    fmt.Println("Policy attached to role ...")
}

func registerScalableTarget(
    autoscalingClient *applicationautoscaling.ApplicationAutoScaling,
    dimension string,
    roleARN string,
) {
    input := &applicationautoscaling.RegisterScalableTargetInput{
        MaxCapacity:       aws.Int64(100),
        MinCapacity:       aws.Int64(1),
        ResourceId:        aws.String(resourceID),
        RoleARN:           aws.String(roleARN),
        ScalableDimension: aws.String(dimension),
        ServiceNamespace:  aws.String("dynamodb"),
    }
    autoscalingClient.RegisterScalableTarget(input)
}

func putScalingPolicy (
    autoscalingClient *applicationautoscaling.ApplicationAutoScaling,
    dimension string,
    metricType string,
) {
    policyInput := &applicationautoscaling.PutScalingPolicyInput{
        PolicyName:        aws.String(policyName),
        PolicyType:        aws.String("TargetTrackingScaling"),
        ResourceId:        aws.String(resourceID),
        ScalableDimension: aws.String(dimension),
        ServiceNamespace:  aws.String("dynamodb"),
        TargetTrackingScalingPolicyConfiguration: &applicationautoscaling.TargetTrackingScalingPolicyConfiguration{
            DisableScaleIn:   aws.Bool(true),
            PredefinedMetricSpecification: &applicationautoscaling.PredefinedMetricSpecification{
                PredefinedMetricType: aws.String(metricType),
            },
            ScaleOutCooldown: aws.Int64(150),
            ScaleInCooldown:  aws.Int64(150),
            TargetValue:      aws.Float64(50),
        },
    }
    autoscalingClient.PutScalingPolicy(policyInput)
}

func registerAutoscaling(roleARN string) {
    autoscalingClient := applicationautoscaling.New(getSession())

    registerScalableTarget(autoscalingClient, readDimension, roleARN)
    fmt.Println("Read scalable target registered ...")

    registerScalableTarget(autoscalingClient, writeDimension, roleARN)
    fmt.Println("Write scalable target registered ...")

    putScalingPolicy(autoscalingClient, readDimension, readMetric)
    fmt.Println("Read scaling policy updated ...")

    putScalingPolicy(autoscalingClient, writeDimension, writeMetric)
    fmt.Println("Write scaling policy updated ...")
}

func enableAutoscaling() error {
    iamClient := iam.New(getSession())

    // Perform IAM requirements before being able to alter the table
    roleOutput, err := createRole(iamClient)

    if err != nil {
        fmt.Println("Error creating pre requisites", err)
        return err
    }

    policyArn, err := createPolicy(iamClient)

    if err != nil {
        fmt.Println("Error creating pre requisites", err)
        return err
    }

    attachPolicy(iamClient, policyArn, *roleOutput.Role.RoleName)
    registerAutoscaling(*roleOutput.Role.Arn)

    return nil
}

func main() {
    fmt.Println("Updating table to enable autoscaling ...")
    enableAutoscaling()
    fmt.Println("Finished ...")
}
