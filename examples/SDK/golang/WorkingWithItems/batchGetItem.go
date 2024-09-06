package main

import (
	"fmt"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/dynamodb"
)


func main() {

	// Create Session
	sess := session.Must(session.NewSessionWithOptions(session.Options{
		SharedConfigState: session.SharedConfigEnable,
	}))

	// Create DynamoDB Client
	svc := dynamodb.New(sess, aws.NewConfig())

	// Get Items
	input := &dynamodb.BatchGetItemInput{
		RequestItems: map[string]*dynamodb.KeysAndAttributes{
			"RetailDatabase": {
				Keys: []map[string]*dynamodb.AttributeValue{
					{
						"pk": &dynamodb.AttributeValue{
							S: aws.String("jose.schneller@somewhere.com"),
						},
						"sk": &dynamodb.AttributeValue{
							S: aws.String("metadata"),
						},
					},
					{
						"pk": &dynamodb.AttributeValue{
							S: aws.String("vikram.johnson@somewhere.com"),
						},
						"sk": &dynamodb.AttributeValue{
							S: aws.String("metadata"),
						},
					},
					{
						"pk": &dynamodb.AttributeValue{
							S: aws.String("jim.bob@somewhere.com"),
						},
						"sk": &dynamodb.AttributeValue{
							S: aws.String("metadata"),
						},
					},
				},
			},
		},
	}

	batch, err := svc.BatchGetItem(input)

	// Catch Error
	if err != nil {
		fmt.Println("GetItem API call failed:")
		fmt.Println((err.Error()))
	}

	fmt.Println(batch)
}
