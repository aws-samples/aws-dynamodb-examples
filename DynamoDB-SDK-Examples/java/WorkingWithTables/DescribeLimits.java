package com.example.myapp;

import software.amazon.awssdk.services.dynamodb.DynamoDbClient;

public class DescribeLimits {

    public static void main(String[] args) {
        // Create Client
        DynamoDbClient client = DynamoDbClient.builder().build();
        System.out.println(client.describeLimits());
    }
}