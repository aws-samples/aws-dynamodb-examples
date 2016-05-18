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
package com.amazonaws.codesamples.gsg;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import com.amazonaws.auth.profile.ProfileCredentialsProvider;
import com.amazonaws.services.dynamodbv2.AmazonDynamoDBClient;
import com.amazonaws.services.dynamodbv2.AmazonDynamoDBStreamsClient;
import com.amazonaws.services.dynamodbv2.model.AttributeAction;
import com.amazonaws.services.dynamodbv2.model.AttributeDefinition;
import com.amazonaws.services.dynamodbv2.model.AttributeValue;
import com.amazonaws.services.dynamodbv2.model.AttributeValueUpdate;
import com.amazonaws.services.dynamodbv2.model.CreateTableRequest;
import com.amazonaws.services.dynamodbv2.model.DescribeStreamRequest;
import com.amazonaws.services.dynamodbv2.model.DescribeStreamResult;
import com.amazonaws.services.dynamodbv2.model.DescribeTableResult;
import com.amazonaws.services.dynamodbv2.model.GetRecordsRequest;
import com.amazonaws.services.dynamodbv2.model.GetRecordsResult;
import com.amazonaws.services.dynamodbv2.model.GetShardIteratorRequest;
import com.amazonaws.services.dynamodbv2.model.GetShardIteratorResult;
import com.amazonaws.services.dynamodbv2.model.KeySchemaElement;
import com.amazonaws.services.dynamodbv2.model.KeyType;
import com.amazonaws.services.dynamodbv2.model.ProvisionedThroughput;
import com.amazonaws.services.dynamodbv2.model.Record;
import com.amazonaws.services.dynamodbv2.model.Shard;
import com.amazonaws.services.dynamodbv2.model.ShardIteratorType;
import com.amazonaws.services.dynamodbv2.model.StreamSpecification;
import com.amazonaws.services.dynamodbv2.model.StreamViewType;
import com.amazonaws.services.dynamodbv2.util.TableUtils;

public class StreamsLowLevelDemo {

    private static AmazonDynamoDBClient dynamoDBClient = 
        new AmazonDynamoDBClient(new ProfileCredentialsProvider());

    private static AmazonDynamoDBStreamsClient streamsClient = 
        new AmazonDynamoDBStreamsClient(new ProfileCredentialsProvider());

    public static void main(String args[]) {

        dynamoDBClient.setEndpoint("DYNAMODB_ENDPOINT_GOES_HERE");  
    
        streamsClient.setEndpoint("STREAMS_ENDPOINT_GOES_HERE");  

        // Create the table
        String tableName = "TestTableForStreams";

        ArrayList<AttributeDefinition> attributeDefinitions = 
            new ArrayList<AttributeDefinition>();

        attributeDefinitions.add(new AttributeDefinition()
            .withAttributeName("Id")
            .withAttributeType("N"));

        ArrayList<KeySchemaElement> keySchema = new ArrayList<KeySchemaElement>();
        keySchema.add(new KeySchemaElement()
            .withAttributeName("Id")
            .withKeyType(KeyType.HASH));

        StreamSpecification streamSpecification = new StreamSpecification();
        streamSpecification.setStreamEnabled(true);
        streamSpecification.setStreamViewType(StreamViewType.NEW_AND_OLD_IMAGES);

        CreateTableRequest createTableRequest = new CreateTableRequest()
            .withTableName(tableName)
            .withKeySchema(keySchema)
            .withAttributeDefinitions(attributeDefinitions)
            .withProvisionedThroughput(new ProvisionedThroughput()
                .withReadCapacityUnits(1L)
                .withWriteCapacityUnits(1L))
            .withStreamSpecification(streamSpecification);

        System.out.println("Issuing CreateTable request for " + tableName);
        dynamoDBClient.createTable(createTableRequest);

        System.out.println("Waiting for " + tableName + " to be created...");
        try {
            TableUtils.waitUntilActive(dynamoDBClient, tableName);
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
        
        // Determine the Streams settings for the table

        DescribeTableResult describeTableResult = dynamoDBClient.describeTable(tableName);

        String myStreamArn = describeTableResult.getTable().getLatestStreamArn();
        StreamSpecification myStreamSpec = 
            describeTableResult.getTable().getStreamSpecification();

        System.out.println("Current stream ARN for " + tableName + ": "+ myStreamArn);
        System.out.println("Stream enabled: "+ myStreamSpec.getStreamEnabled());
        System.out.println("Update view type: "+ myStreamSpec.getStreamViewType());

        // Add a new item

        int numChanges = 0;
        System.out.println("Making some changes to table data");
        Map<String, AttributeValue> item = new HashMap<String, AttributeValue>();
        item.put("Id", new AttributeValue().withN("101"));
        item.put("Message", new AttributeValue().withS("New item!"));
        dynamoDBClient.putItem(tableName, item);
        numChanges++;

        // Update the item
        
        Map<String, AttributeValue> key = new HashMap<String, AttributeValue>();
        key.put("Id", new AttributeValue().withN("101"));
        Map<String, AttributeValueUpdate> attributeUpdates = 
            new HashMap<String, AttributeValueUpdate>();
        attributeUpdates.put("Message", new AttributeValueUpdate()
            .withAction(AttributeAction.PUT)
            .withValue(new AttributeValue().withS("This item has changed")));
        dynamoDBClient.updateItem(tableName, key, attributeUpdates);
        numChanges++; 

        // Delete the item
        
        dynamoDBClient.deleteItem(tableName, key);
        numChanges++;
        
        // Get the shards in the stream
        
        DescribeStreamResult describeStreamResult = 
            streamsClient.describeStream(new DescribeStreamRequest()
                .withStreamArn(myStreamArn));
        String streamArn = 
            describeStreamResult.getStreamDescription().getStreamArn();
        List<Shard> shards = 
            describeStreamResult.getStreamDescription().getShards();

        // Process each shard

        for (Shard shard : shards) {
            String shardId = shard.getShardId();
            System.out.println(
                "Processing " + shardId + " from stream "+ streamArn);

            // Get an iterator for the current shard

            GetShardIteratorRequest getShardIteratorRequest = new GetShardIteratorRequest()
                .withStreamArn(myStreamArn)
                .withShardId(shardId)
                .withShardIteratorType(ShardIteratorType.TRIM_HORIZON);
            GetShardIteratorResult getShardIteratorResult = 
                streamsClient.getShardIterator(getShardIteratorRequest);
            String nextItr = getShardIteratorResult.getShardIterator();


            while (nextItr != null && numChanges > 0) {
            
                // Use the iterator to read the data records from the shard
                
                GetRecordsResult getRecordsResult = 
                    streamsClient.getRecords(new GetRecordsRequest().
                        withShardIterator(nextItr));
                List<Record> records = getRecordsResult.getRecords();
                System.out.println("Getting records...");
                for (Record record : records) {
                    System.out.println(record);
                    numChanges--;
                }
                nextItr = getRecordsResult.getNextShardIterator();
            }

            // Delete the table

            System.out.println("Deleting the table...");
            dynamoDBClient.deleteTable(tableName);

            System.out.println("Demo complete");
        }
    }
}
