package main

import (
	"fmt"
    "log"

    "github.com/aws/aws-sdk-go/aws"
    "github.com/aws/aws-sdk-go/aws/session"
    "github.com/aws/aws-sdk-go/service/dynamodb"
    "github.com/aws/aws-sdk-go/service/dynamodb/dynamodbattribute"
)

// ItemInfo holds info to update
type Address struct {
    Road string `json:":r"`
}

// Item identifies the item in the table
type Item struct {
    Pk string  `json:"pk"`
    Sk string  `json:"sk"`
}

func main() {
  
	// Create Session
    sess, err := session.NewSession(&aws.Config{
        Region: aws.String("eu-west-1")},
    )

    // Create DynamoDB client
    svc := dynamodb.New(sess)

	// Attribute to update
	address := Address{
			Road: "8123 Updated Rd",
	}

	// Keys for item
    item := Item{
        Pk: "jose.schneller@somewhere.com",
        Sk: "metadata",
    }

	// Marshal 
    expr, err := dynamodbattribute.MarshalMap(address)
    if err != nil {
        log.Fatalf("Got error marshalling item: %s", err)
    }

    key, err := dynamodbattribute.MarshalMap(item)
    if err != nil {
        log.Fatalf("Got error marshalling item: %s", err)
    }

    // Update item params
    input := &dynamodb.UpdateItemInput{
        TableName:                 aws.String("RetailDatabase"),
        Key:                       key,
        UpdateExpression:          aws.String("set address.road = :r"),
		ExpressionAttributeValues: expr,
		ReturnValues:              aws.String("UPDATED_NEW"),
    }

	// Update item
    _, err = svc.UpdateItem(input)

    if err != nil {
        log.Fatalf("Got error calling UpdateItem: %s", err)
    }

    fmt.Println("Successfully updated item")
}