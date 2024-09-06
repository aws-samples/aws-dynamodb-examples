package com.example.myapp;

import software.amazon.awssdk.core.async.SdkPublisher;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbAsyncIndex;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbAsyncTable;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbEnhancedAsyncClient;
import software.amazon.awssdk.enhanced.dynamodb.TableSchema;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbBean;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbPartitionKey;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbSecondaryPartitionKey;
import software.amazon.awssdk.enhanced.dynamodb.model.Page;
import software.amazon.awssdk.enhanced.dynamodb.model.PagePublisher;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.dynamodb.DynamoDbAsyncClient;

import static software.amazon.awssdk.enhanced.dynamodb.model.QueryConditional.keyEqualTo;

public class TableAsyncQueryIndex {

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

            // Mapping an Index to DynamoDB Async Index
            DynamoDbAsyncIndex<Customer> customersByName = customerTable.index("email-index");

            // Perform Query and Pass Result to SDK Publisher
            SdkPublisher<Page<Customer>> customersWithName =
                    customersByName.query(r -> r.queryConditional(keyEqualTo(k -> k.partitionValue("lhnng@amazon.com"))));

            // Create a Page Publisher with our Result
            PagePublisher<Customer> pages = PagePublisher.create(customersWithName);

            // Subscribe to our Result and Print Result on Each Returned Item per Page
            pages.items().subscribe(item -> System.out.println(item.getName() + " " + item.getId()));

            // Keep Thread Alive For Results (only needed for short lived threads/testing purposes)
            Thread.sleep(3000);

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

