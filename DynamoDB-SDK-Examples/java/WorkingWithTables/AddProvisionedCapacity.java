package com.example.myapp;

import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.ProvisionedThroughput;
import software.amazon.awssdk.services.dynamodb.model.UpdateTableRequest;

public class AddProvisionedCapacity {

    public static void main(String[] args) {
        // Create Client
        DynamoDbClient client = DynamoDbClient.builder().build();
        // Update the existing table
        client.updateTable(UpdateTableRequest.builder()
                .provisionedThroughput(ProvisionedThroughput.builder()
                        .readCapacityUnits(10L)
                        .writeCapacityUnits(10L)
                        .build())
                .tableName("RetailDatabase")
                .build());
    }
}