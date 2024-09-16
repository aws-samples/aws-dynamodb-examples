package com.example.myapp;

import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.BillingMode;
import software.amazon.awssdk.services.dynamodb.model.UpdateTableRequest;

public class TableChangeToOnDemand {

    public static void main(String[] args) {
        // Create Client
        DynamoDbClient client = DynamoDbClient.builder().build();
        client.updateTable(UpdateTableRequest.builder()
                .billingMode(BillingMode.PAY_PER_REQUEST)
                .tableName("RetailDatabase")
                .build());
    }
}