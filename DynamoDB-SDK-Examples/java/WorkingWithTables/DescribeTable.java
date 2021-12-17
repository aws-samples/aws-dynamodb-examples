package com.example.myapp;

import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.DescribeTableRequest;

public class DescribeTable {

    public static void main(String[] args) {
        // Create Client
        DynamoDbClient client = DynamoDbClient.builder().build();
        System.out.println(client.describeTable(DescribeTableRequest.builder().tableName("RetailDatabase").build()));
    }
}