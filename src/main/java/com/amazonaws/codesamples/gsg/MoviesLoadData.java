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

import java.io.File;
import java.util.Iterator;

import com.amazonaws.services.dynamodbv2.AmazonDynamoDBClient;
import com.amazonaws.services.dynamodbv2.document.DynamoDB;
import com.amazonaws.services.dynamodbv2.document.Item;
import com.amazonaws.services.dynamodbv2.document.Table;
import com.fasterxml.jackson.core.JsonFactory;
import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;

public class MoviesLoadData {

    public static void main(String[] args) throws Exception {

        AmazonDynamoDBClient client = new AmazonDynamoDBClient();
        client.setEndpoint("http://localhost:8000");
        DynamoDB dynamoDB = new DynamoDB(client);

        Table table = dynamoDB.getTable("Movies");

        JsonParser parser = new JsonFactory()
            .createParser(new File("moviedata.json"));
                
        Iterator<JsonNode> iter = getRootNode(parser).iterator();
        
        ObjectNode currentNode;
        while (iter.hasNext()) {
            currentNode = (ObjectNode) iter.next();
           
            int year = getYear(currentNode);
            String title = getTitle(currentNode);

            System.out.println("Adding movie: " + year + " " + title);

            table.putItem(new Item()
                .withPrimaryKey("year", year, "title", title)
                .withJSON("info",  getInfo(currentNode)));
        }
        
        parser.close();
    }
    
    
    private static JsonNode getRootNode(JsonParser p) throws Exception
    {
        return new ObjectMapper().readTree(p);
    }
    
    private static int getYear(ObjectNode n) {
        return n.path("year").asInt();
    }
    
    private static String getTitle(ObjectNode n) {
        return n.path("title").asText();
    }
    
    private static String getInfo(ObjectNode n) {
        return n.path("info").toString();
    }
    
}
