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

	// Write Items
	input := &dynamodb.BatchWriteItemInput{
		RequestItems: map[string][]*dynamodb.WriteRequest{
			"RetailDatabase": {
				{
					PutRequest: &dynamodb.PutRequest{
						Item: map[string]*dynamodb.AttributeValue{
							"pk": {
								S: aws.String("jose.schneller@somewhere.com"),
							},
							"sk": {
								S: aws.String("metadata"),
							},
							"firstName": {
								S: aws.String("jose"),
							},
							"lastName": {
								S: aws.String("schneller"),
							},
							"name": {
								S: aws.String("Jose Schneller"),
							},
							"username": {
								S: aws.String("joses"),
							},
						},
					},
				},
				{
					PutRequest: &dynamodb.PutRequest{
						Item: map[string]*dynamodb.AttributeValue{
							"pk": {
								S: aws.String("jim.bob@somewhere.com"),
							},
							"sk": {
								S: aws.String("metadata"),
							},
							"firstName": {
								S: aws.String("jim"),
							},
							"lastName": {
								S: aws.String("bob"),
							},
							"name": {
								S: aws.String("Jim Bob"),
							},
							"username": {
								S: aws.String("jbob"),
							},
						},
					},
				},
				
			},
		},
	}


	result, err := svc.BatchWriteItem(input)

	// Catch Error
	if err != nil {
		fmt.Println("BatchWrite API call failed:")
		fmt.Println((err.Error()))
	}

	fmt.Println("Successfully added item to table")
	fmt.Println(result)
}
