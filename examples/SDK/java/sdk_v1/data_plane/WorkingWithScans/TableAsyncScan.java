package com.example.myapp;

import software.amazon.awssdk.core.async.SdkPublisher;
import software.amazon.awssdk.enhanced.dynamodb.*;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbBean;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbPartitionKey;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbSecondaryPartitionKey;
import software.amazon.awssdk.enhanced.dynamodb.model.Page;
import software.amazon.awssdk.enhanced.dynamodb.model.PagePublisher;
import software.amazon.awssdk.enhanced.dynamodb.model.ScanEnhancedRequest;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.dynamodb.DynamoDbAsyncClient;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;

import java.util.HashMap;
import java.util.Map;

public class TableAsyncScanTable {

    public static void main(String[] args) {


        // Create Async Client
        DynamoDbAsyncClient client = DynamoDbAsyncClient.builder()
                .region(Region.EU_WEST_1)
                .build();

        // Create Enhanced Async Client, Passing Async Client
        DynamoDbEnhancedAsyncClient enhancedClient = DynamoDbEnhancedAsyncClient.builder()
                .dynamoDbClient(client)
                .build();

        try {

            // Mapping a Table to DynamoDB Async Table
            DynamoDbAsyncTable<Customer> customerTable = enhancedClient.table("test",
                    TableSchema.fromBean(Customer.class));


            // Setting Values for FilterCondition
            AttributeValue att = AttributeValue.builder()
                    .s("lhnng@amazon.com")
                    .build();

            Map<String, AttributeValue> expressionValues = new HashMap<>();
            expressionValues.put(":value", att);

            // Setting Names for FilterExpression
            Map<String, String> expressionNames = new HashMap<>();
            expressionNames.put("#e", "email");

            // Building FilterExpression
            Expression expression = Expression.builder()
                    .expression("#e = :value")
                    .expressionValues(expressionValues)
                    .expressionNames(expressionNames)
                    .build();

            // Building Scan Request and Passing FilterExpression
            ScanEnhancedRequest scanEnhancedRequest = ScanEnhancedRequest.builder().filterExpression(expression).build();

            // Perform Scan and Pass Result to SDK Publisher
            SdkPublisher<Page<Customer>> customersWithName =
                    customerTable.scan(scanEnhancedRequest);

            // Create a Page Publisher with our Result
            PagePublisher<Customer> pages = PagePublisher.create(customersWithName);

            // Subscribe to our Result and Print Result on Each Returned Item per Page
            pages.items().subscribe(item -> System.out.println(item.getName() + " " + item.getEmail()));

            // Keep Thread Alive For Results (only needed for short lived threads/testing purposes)
            Thread.sleep(2000);

        } catch (Exception e) {
            System.out.println(e.getMessage());
        }
    }

    // Customer Class
    @DynamoDbBean
    public static class Customer {

        private String id;
        private String name;
        private String email;
        private Long versionId;

        public Customer() {
        }

        // Getter/Setter
        @DynamoDbPartitionKey
        public String getId() {
            return id;
        }

        public void setId(String id) {
            this.id = id;
        }

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }

        @DynamoDbSecondaryPartitionKey(indexNames = { "email-index" })
        public String getEmail() {
            return email;
        }

        public void setEmail(String email) {
            this.email = email;
        }

        public Long getVersionId() { return versionId; }

        public void setVersionId(Long versionId) {
            this.versionId = versionId;
        }

    }

}

