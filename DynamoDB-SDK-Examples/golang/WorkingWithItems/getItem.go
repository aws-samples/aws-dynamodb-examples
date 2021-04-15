package main

import (
	"fmt"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/dynamodb"
	"github.com/aws/aws-sdk-go/service/dynamodb/dynamodbattribute"
)

func main() {

	// Item to Get
	type Item struct {
		Pk   string `dynamodbav:"pk"`
		SK	 string `dynamodbav:"sk"`
		Name string `dynamodbav:"name"`
		Username string `dynamodbav:"username"`
	}

	// Create Session
	sess := session.Must(session.NewSessionWithOptions(session.Options{
		SharedConfigState: session.SharedConfigEnable,
	}))

	// Create DynamoDB Client
	svc := dynamodb.New(sess, aws.NewConfig())

	// Get Item
    result, err := svc.GetItem(&dynamodb.GetItemInput{
        TableName: aws.String("RetailDatabase"),
        Key: map[string]*dynamodb.AttributeValue{
            "pk": {
                S: aws.String("jose.schneller@somewhere.com"),
            },
            "sk": {
                S: aws.String("metadata"),
            },
        },
    })

	// Catch Error
	if err != nil {
		fmt.Println("GetItem API call failed:")
		fmt.Println((err.Error()))
	}

	item := Item{}

	// Unmarhsall
    err = dynamodbattribute.UnmarshalMap(result.Item, &item)

    if err != nil {
        panic(fmt.Sprintf("Failed to unmarshal Record, %v", err))
    }

	// If Item Returns Empty
    if item.Pk == "" {
        fmt.Println("Could not find Item")
        return
    }

	// Print Result
    fmt.Println("Found item:")
    fmt.Println("Name:  ", item.Name)
    fmt.Println("Alias: ", item.Username)
    fmt.Println("Email: ", item.Pk)
}
