/*
* Copyright 2014-2015 Amazon.com, Inc. or its affiliates. All Rights Reserved.
*
* Licensed under the Apache License, Version 2.0 (the "License").
* You may not use this file except in compliance with the License.
* A copy of the License is located at
*
*  http://aws.amazon.com/apache2.0
*
* or in the "license" file accompanying this file. This file is distributed
* on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
* express or implied. See the License for the specific language governing
* permissions and limitations under the License.
*/
package com.amazonaws.codesamples;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Date;
import java.util.HashSet;
import java.util.TimeZone;

import com.amazonaws.auth.profile.ProfileCredentialsProvider;
import com.amazonaws.services.dynamodbv2.AmazonDynamoDBClient;
import com.amazonaws.services.dynamodbv2.document.DynamoDB;
import com.amazonaws.services.dynamodbv2.document.Item;
import com.amazonaws.services.dynamodbv2.document.Table;
import com.amazonaws.services.dynamodbv2.model.AttributeDefinition;
import com.amazonaws.services.dynamodbv2.model.CreateTableRequest;
import com.amazonaws.services.dynamodbv2.model.KeySchemaElement;
import com.amazonaws.services.dynamodbv2.model.KeyType;
import com.amazonaws.services.dynamodbv2.model.LocalSecondaryIndex;
import com.amazonaws.services.dynamodbv2.model.Projection;
import com.amazonaws.services.dynamodbv2.model.ProjectionType;
import com.amazonaws.services.dynamodbv2.model.ProvisionedThroughput;

public class CreateTablesLoadData {

    static DynamoDB dynamoDB = new DynamoDB(new AmazonDynamoDBClient(
            new ProfileCredentialsProvider()));

    static SimpleDateFormat dateFormatter = new SimpleDateFormat(
            "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");

    static String productCatalogTableName = "ProductCatalog";
    static String forumTableName = "Forum";
    static String threadTableName = "Thread";
    static String replyTableName = "Reply";

    public static void main(String[] args) throws Exception {

        try {

            deleteTable(productCatalogTableName);
            deleteTable(forumTableName);
            deleteTable(threadTableName);
            deleteTable(replyTableName);

            // Parameter1: table name // Parameter2: reads per second //
            // Parameter3: writes per second // Parameter4/5: hash key and type
            // Parameter6/7: range key and type (if applicable)

            createTable(productCatalogTableName, 10L, 5L, "Id", "N");
            createTable(forumTableName, 10L, 5L, "Name", "S");
            createTable(threadTableName, 10L, 5L, "ForumName", "S", "Subject", "S");
            createTable(replyTableName, 10L, 5L, "Id", "S", "ReplyDateTime", "S");

            loadSampleProducts(productCatalogTableName);
            loadSampleForums(forumTableName);
            loadSampleThreads(threadTableName);
            loadSampleReplies(replyTableName);

        } catch (Exception e) {
            System.err.println("Program failed:");
            System.err.println(e.getMessage());
        }
        System.out.println("Success.");
    }

    private static void deleteTable(String tableName) {
        Table table = dynamoDB.getTable(tableName);
        try {
            System.out.println("Issuing DeleteTable request for " + tableName);
            table.delete();
            System.out.println("Waiting for " + tableName
                + " to be deleted...this may take a while...");
            table.waitForDelete();

        } catch (Exception e) {
            System.err.println("DeleteTable request failed for " + tableName);
            System.err.println(e.getMessage());
        }
    }

    private static void createTable(
        String tableName, long readCapacityUnits, long writeCapacityUnits, 
        String hashKeyName, String hashKeyType) {

        createTable(tableName, readCapacityUnits, writeCapacityUnits,
            hashKeyName, hashKeyType, null, null);
    }

    private static void createTable(
        String tableName, long readCapacityUnits, long writeCapacityUnits, 
        String hashKeyName, String hashKeyType, 
        String rangeKeyName, String rangeKeyType) {

        try {

            ArrayList<KeySchemaElement> keySchema = new ArrayList<KeySchemaElement>();
            keySchema.add(new KeySchemaElement()
                .withAttributeName(hashKeyName)
                .withKeyType(KeyType.HASH));
            
            ArrayList<AttributeDefinition> attributeDefinitions = new ArrayList<AttributeDefinition>();
            attributeDefinitions.add(new AttributeDefinition()
                .withAttributeName(hashKeyName)
                .withAttributeType(hashKeyType));

            if (rangeKeyName != null) {
                keySchema.add(new KeySchemaElement()
                    .withAttributeName(rangeKeyName)
                    .withKeyType(KeyType.RANGE));
                attributeDefinitions.add(new AttributeDefinition()
                    .withAttributeName(rangeKeyName)
                    .withAttributeType(rangeKeyType));
            }

            CreateTableRequest request = new CreateTableRequest()
                    .withTableName(tableName)
                    .withKeySchema(keySchema)
                    .withProvisionedThroughput( new ProvisionedThroughput()
                        .withReadCapacityUnits(readCapacityUnits)
                        .withWriteCapacityUnits(writeCapacityUnits));

            // If this is the Reply table, define a local secondary index
            if (replyTableName.equals(tableName)) {
                
                attributeDefinitions.add(new AttributeDefinition()
                    .withAttributeName("PostedBy")
                    .withAttributeType("S"));

                ArrayList<LocalSecondaryIndex> localSecondaryIndexes = new ArrayList<LocalSecondaryIndex>();
                localSecondaryIndexes.add(new LocalSecondaryIndex()
                    .withIndexName("PostedBy-Index")
                    .withKeySchema(
                        new KeySchemaElement().withAttributeName(hashKeyName).withKeyType(KeyType.HASH), 
                        new KeySchemaElement() .withAttributeName("PostedBy") .withKeyType(KeyType.RANGE))
                    .withProjection(new Projection() .withProjectionType(ProjectionType.KEYS_ONLY)));

                request.setLocalSecondaryIndexes(localSecondaryIndexes);
            }

            request.setAttributeDefinitions(attributeDefinitions);

            System.out.println("Issuing CreateTable request for " + tableName);
            Table table = dynamoDB.createTable(request);
            System.out.println("Waiting for " + tableName
                + " to be created...this may take a while...");
            table.waitForActive();

        } catch (Exception e) {
            System.err.println("CreateTable request failed for " + tableName);
            System.err.println(e.getMessage());
        }
    }

    private static void loadSampleProducts(String tableName) {

        Table table = dynamoDB.getTable(tableName);

        try {

            System.out.println("Adding data to " + tableName);

            Item item = new Item()
                .withPrimaryKey("Id", 101)
                .withString("Title", "Book 101 Title")
                .withString("ISBN", "111-1111111111")
                .withStringSet("Authors", new HashSet<String>(
                    Arrays.asList("Author1")))
                .withNumber("Price", 2)
                .withString("Dimensions", "8.5 x 11.0 x 0.5")
                .withNumber("PageCount", 500)
                .withBoolean("InPublication", true)
                .withString("ProductCategory", "Book");
            table.putItem(item);

            item = new Item()
                    .withPrimaryKey("Id", 102)
                    .withString("Title", "Book 102 Title")
                    .withString("ISBN", "222-2222222222")
                    .withStringSet( "Authors", new HashSet<String>(
                        Arrays.asList("Author1", "Author2")))
                    .withNumber("Price", 20)
                    .withString("Dimensions", "8.5 x 11.0 x 0.8")
                    .withNumber("PageCount", 600)
                    .withBoolean("InPublication", true)
                    .withString("ProductCategory", "Book");
            table.putItem(item);

            item = new Item()
                .withPrimaryKey("Id", 103)
                .withString("Title", "Book 103 Title")
                .withString("ISBN", "333-3333333333")
                .withStringSet( "Authors", new HashSet<String>(
                    Arrays.asList("Author1", "Author2")))
                // Intentional. Later we'll run Scan to find price error. Find
                // items > 1000 in price.
                .withNumber("Price", 2000)
                .withString("Dimensions", "8.5 x 11.0 x 1.5")
                .withNumber("PageCount", 600)
                .withBoolean("InPublication", false)
                .withString("ProductCategory", "Book");
            table.putItem(item);

            // Add bikes.

            item = new Item()
                .withPrimaryKey("Id", 201)
                .withString("Title", "18-Bike-201")
                // Size, followed by some title.
                .withString("Description", "201 Description")
                .withString("BicycleType", "Road")
                .withString("Brand", "Mountain A")
                // Trek, Specialized.
                .withNumber("Price", 100)
                .withString("Gender", "M")
                // Men's
                .withStringSet("Color", new HashSet<String>(
                    Arrays.asList("Red", "Black")))
                .withString("ProductCategory", "Bicycle");
            table.putItem(item);

            item = new Item()
                .withPrimaryKey("Id", 202)
                .withString("Title", "21-Bike-202")
                .withString("Description", "202 Description")
                .withString("BicycleType", "Road")
                .withString("Brand", "Brand-Company A")
                .withNumber("Price", 200)
                .withString("Gender", "M")
                .withStringSet( "Color", new HashSet<String>(
                    Arrays.asList("Green", "Black")))
                .withString("ProductCategory", "Bicycle");
            table.putItem(item);

            item = new Item()
                .withPrimaryKey("Id", 203)
                .withString("Title", "19-Bike-203")
                .withString("Description", "203 Description")
                .withString("BicycleType", "Road")
                .withString("Brand", "Brand-Company B")
                .withNumber("Price", 300)
                .withString("Gender", "W")
                // Women's
                .withStringSet( "Color", new HashSet<String>(
                    Arrays.asList("Red", "Green", "Black")))
                .withString("ProductCategory", "Bicycle");
            table.putItem(item);

            item = new Item()
                .withPrimaryKey("Id", 204)
                .withString("Title", "18-Bike-204")
                .withString("Description", "204 Description")
                .withString("BicycleType", "Mountain")
                .withString("Brand", "Brand-Company B")
                .withNumber("Price", 400)
                .withString("Gender", "W")
                .withStringSet("Color", new HashSet<String>(
                    Arrays.asList("Red")))
                .withString("ProductCategory", "Bicycle");
            table.putItem(item);

            item = new Item()
                .withPrimaryKey("Id", 205)
                .withString("Title", "20-Bike-205")
                .withString("Description", "205 Description")
                .withString("BicycleType", "Hybrid")
                .withString("Brand", "Brand-Company C")
                .withNumber("Price", 500)
                .withString("Gender", "B")
                // Boy's
                .withStringSet("Color", new HashSet<String>(
                    Arrays.asList("Red", "Black")))
                .withString("ProductCategory", "Bicycle");
            table.putItem(item);

        } catch (Exception e) {
            System.err.println("Failed to create item in " + tableName);
            System.err.println(e.getMessage());
        }

    }

    private static void loadSampleForums(String tableName) {

        Table table = dynamoDB.getTable(tableName);

        try {

            System.out.println("Adding data to " + tableName);

            Item item = new Item().withPrimaryKey("Name", "Amazon DynamoDB")
                .withString("Category", "Amazon Web Services")
                .withNumber("Threads", 2).withNumber("Messages", 4)
                .withNumber("Views", 1000);
            table.putItem(item);

            item = new Item().withPrimaryKey("Name", "Amazon S3")
                .withString("Category", "Amazon Web Services")
                .withNumber("Threads", 0);
            table.putItem(item);

        } catch (Exception e) {
            System.err.println("Failed to create item in " + tableName);
            System.err.println(e.getMessage());
        }
    }

    private static void loadSampleThreads(String tableName) {
        try {
            long time1 = (new Date()).getTime() - (7 * 24 * 60 * 60 * 1000); // 7
            // days
            // ago
            long time2 = (new Date()).getTime() - (14 * 24 * 60 * 60 * 1000); // 14
            // days
            // ago
            long time3 = (new Date()).getTime() - (21 * 24 * 60 * 60 * 1000); // 21
            // days
            // ago

            Date date1 = new Date();
            date1.setTime(time1);

            Date date2 = new Date();
            date2.setTime(time2);

            Date date3 = new Date();
            date3.setTime(time3);

            dateFormatter.setTimeZone(TimeZone.getTimeZone("UTC"));

            Table table = dynamoDB.getTable(tableName);

            System.out.println("Adding data to " + tableName);

            Item item = new Item()
                .withPrimaryKey("ForumName", "Amazon DynamoDB")
                .withString("Subject", "DynamoDB Thread 1")
                .withString("Message", "DynamoDB thread 1 message")
                .withString("LastPostedBy", "User A")
                .withString("LastPostedDateTime", dateFormatter.format(date2))
                .withNumber("Views", 0)
                .withNumber("Replies", 0)
                .withNumber("Answered", 0)
                .withStringSet( "Tags", new HashSet<String>(
                    Arrays.asList("index", "primarykey", "table")));
            table.putItem(item);

            item = new Item()
                .withPrimaryKey("ForumName", "Amazon DynamoDB")
                .withString("Subject", "DynamoDB Thread 2")
                .withString("Message", "DynamoDB thread 2 message")
                .withString("LastPostedBy", "User A")
                .withString("LastPostedDateTime", dateFormatter.format(date3))
                .withNumber("Views", 0)
                .withNumber("Replies", 0)
                .withNumber("Answered", 0)
                .withStringSet( "Tags", new HashSet<String>(
                    Arrays.asList("index", "primarykey", "rangekey")));
            table.putItem(item);

            item = new Item()
                .withPrimaryKey("ForumName", "Amazon S3")
                .withString("Subject", "S3 Thread 1")
                .withString("Message", "S3 Thread 3 message")
                .withString("LastPostedBy", "User A")
                .withString("LastPostedDateTime", dateFormatter.format(date1))
                .withNumber("Views", 0)
                .withNumber("Replies", 0)
                .withNumber("Answered", 0)
                .withStringSet( "Tags", new HashSet<String>(
                    Arrays.asList("largeobjects", "multipart upload")));
            table.putItem(item);

        } catch (Exception e) {
            System.err.println("Failed to create item in " + tableName);
            System.err.println(e.getMessage());
        }

    }

    private static void loadSampleReplies(String tableName) {
        try {
            // 1 day ago
            long time0 = (new Date()).getTime() - (1 * 24 * 60 * 60 * 1000); 
            // 7 days ago
            long time1 = (new Date()).getTime() - (7 * 24 * 60 * 60 * 1000); 
            // 14 days ago
            long time2 = (new Date()).getTime() - (14 * 24 * 60 * 60 * 1000); 
            // 21 days ago
            long time3 = (new Date()).getTime() - (21 * 24 * 60 * 60 * 1000);

            Date date0 = new Date();
            date0.setTime(time0);

            Date date1 = new Date();
            date1.setTime(time1);

            Date date2 = new Date();
            date2.setTime(time2);

            Date date3 = new Date();
            date3.setTime(time3);

            dateFormatter.setTimeZone(TimeZone.getTimeZone("UTC"));

            Table table = dynamoDB.getTable(tableName);

            System.out.println("Adding data to " + tableName);

            // Add threads.

            Item item = new Item()
                .withPrimaryKey("Id", "Amazon DynamoDB#DynamoDB Thread 1")
                .withString("ReplyDateTime", (dateFormatter.format(date3)))
                .withString("Message", "DynamoDB Thread 1 Reply 1 text")
                .withString("PostedBy", "User A");
            table.putItem(item);

            item = new Item()
                .withPrimaryKey("Id", "Amazon DynamoDB#DynamoDB Thread 1")
                .withString("ReplyDateTime", dateFormatter.format(date2))
                .withString("Message", "DynamoDB Thread 1 Reply 2 text")
                .withString("PostedBy", "User B");
            table.putItem(item);

            item = new Item()
                .withPrimaryKey("Id", "Amazon DynamoDB#DynamoDB Thread 2")
                .withString("ReplyDateTime", dateFormatter.format(date1))
                .withString("Message", "DynamoDB Thread 2 Reply 1 text")
                .withString("PostedBy", "User A");
            table.putItem(item);

            item = new Item()
                .withPrimaryKey("Id", "Amazon DynamoDB#DynamoDB Thread 2")
                .withString("ReplyDateTime", dateFormatter.format(date0))
                .withString("Message", "DynamoDB Thread 2 Reply 2 text")
                .withString("PostedBy", "User A");
            table.putItem(item);

        } catch (Exception e) {
            System.err.println("Failed to create item in " + tableName);
            System.err.println(e.getMessage());

        }
    }

}
