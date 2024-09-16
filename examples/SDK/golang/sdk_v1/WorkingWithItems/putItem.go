package main

import (
    "fmt"
    "os"

    "github.com/aws/aws-sdk-go/aws"
    "github.com/aws/aws-sdk-go/aws/session"
    "github.com/aws/aws-sdk-go/service/dynamodb"
    "github.com/aws/aws-sdk-go/service/dynamodb/dynamodbattribute"
)

// Create structs to hold info about new item
type Address struct {
	City string`json:"city"`
	Country string`json:"country"`
	Pcode string`json:"pcode"`
	Road string`json:"road"`
	State string`json:"state"`
}

type Item struct {
    Pk string`json:"pk"`
    Sk string`json:"sk"`
	Name string`json:"name"`
	FirstName string`json:"firstName"`
	LastName string`json:"lastName"`
	Username string`json:"username"`
	Address Address`json:"address"`
	Age int`json:"age"`
}

func main() {

    // Create Session
    sess, err := session.NewSession(&aws.Config{
        Region: aws.String("eu-west-1")},
    )

    // Create DynamoDB client
    svc := dynamodb.New(sess)

	// Address info
    address := Address{
		City: "Greenbank",
		Country: "USA",
		Pcode: "98253",
		Road: "89105 Bakken Rd",
		State: "WA",
    }

	// Item info
    item := Item{
        Pk: "jose.schneller@somewhere.com",
        Sk: "metadata",
		FirstName: "Jose",
		LastName: "Schneller",
		Name: "Jose Schneller",
		Username: "joses",
		Age: 27,
        Address: address,
    }

	// Marshall
    av, err := dynamodbattribute.MarshalMap(item)

    if err != nil {
        fmt.Println("Got error marshalling map:")
        fmt.Println(err.Error())
        os.Exit(1)
    }

    // Create Item
    input := &dynamodb.PutItemInput{
        Item: av,
        TableName: aws.String("RetailDatabase"),
    }

    _, err = svc.PutItem(input)

    if err != nil {
        fmt.Println("Got error calling PutItem:")
        fmt.Println(err.Error())
        os.Exit(1)
    }

    fmt.Println("Successfully added item to table")
}