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

import java.util.HashMap;
import java.util.Map;

import com.amazonaws.services.dynamodbv2.AmazonDynamoDBClient;
import com.amazonaws.services.dynamodbv2.document.DynamoDB;
import com.amazonaws.services.dynamodbv2.document.Item;
import com.amazonaws.services.dynamodbv2.document.PrimaryKey;
import com.amazonaws.services.dynamodbv2.document.Table;
import com.amazonaws.services.dynamodbv2.document.spec.PutItemSpec;
import com.amazonaws.services.dynamodbv2.document.utils.NameMap;
import com.amazonaws.services.dynamodbv2.model.ConditionalCheckFailedException;

public class MoviesItemOps02 {

    public static void main(String[] args)  {

        AmazonDynamoDBClient client = new AmazonDynamoDBClient();
        client.setEndpoint("http://localhost:8000");
        DynamoDB dynamoDB = new DynamoDB(client);

        Table table = dynamoDB.getTable("Movies");

        int year = 2015;
        String title = "The Big New Movie";

        final Map<String, Object> infoMap = new HashMap<String, Object>();
        infoMap.put("plot",  "Nothing happens at all.");
        infoMap.put("rating",  0.0);
        Item item = new Item()
            .withPrimaryKey(new PrimaryKey("year", year, "title", title))
            .withMap("info", infoMap);
        
        // Attempt a conditional write.  We expect this to fail.

        PutItemSpec putItemSpec = new PutItemSpec()
            .withItem(item)
            .withConditionExpression("attribute_not_exists(#yr) and attribute_not_exists(title)")
            .withNameMap(new NameMap()
                .with("#yr", "year"));
        
        System.out.println("Attempting a conditional write...");
        try {
            table.putItem(putItemSpec);
            System.out.println("PutItem succeeded: " + table.getItem("year", year, "title", title).toJSONPretty());
        } catch (ConditionalCheckFailedException e) {
            e.printStackTrace(System.err);
            System.out.println("PutItem failed");
        }
    }
}
