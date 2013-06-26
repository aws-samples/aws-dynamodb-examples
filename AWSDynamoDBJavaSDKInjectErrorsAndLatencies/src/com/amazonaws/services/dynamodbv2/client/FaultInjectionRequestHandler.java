package com.amazonaws.services.dynamodbv2.client;

/*
 * Copyright 2011 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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
 * 
 * @author pejusd
 *
 */

import java.util.Map;
import java.util.Random;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import com.amazonaws.Request;
import com.amazonaws.handlers.RequestHandler;
import com.amazonaws.services.dynamodbv2.AmazonDynamoDBClient;
import com.amazonaws.services.dynamodbv2.model.AttributeValue;
import com.amazonaws.services.dynamodbv2.model.GetItemRequest;
import com.amazonaws.services.dynamodbv2.model.GetItemResult;
import com.amazonaws.services.dynamodbv2.model.ProvisionedThroughputExceededException;
import com.amazonaws.services.dynamodbv2.model.PutItemRequest;
import com.amazonaws.util.TimingInfo;

public class FaultInjectionRequestHandler extends AmazonDynamoDBClient implements RequestHandler {
    
    private AmazonDynamoDBClient dynamoDBClient;
    private static final Random rnd = new Random(1234);
    private static final Log logger = LogFactory.getLog(FaultInjectionRequestHandler.class);

    public FaultInjectionRequestHandler(AmazonDynamoDBClient dynamoDBClient) {
        this.dynamoDBClient = dynamoDBClient;
    }

    @Override
    public void beforeRequest(Request<?> request) {

        /* Things to do just before a request is executed */
        if (request.getOriginalRequest() instanceof PutItemRequest) {
            
            /* Throw throuhgput exceeded exception for 50% of put requests */
            if (rnd.nextInt(2) == 0) {

                logger.info("Injecting ProvisionedThroughputExceededException");
                throw new ProvisionedThroughputExceededException("Injected Error");
            }
        }
        
        /* Add latency to some Get requests */
        if (request.getOriginalRequest() instanceof GetItemRequest) {
            
            /* Delay 50% of GetItem requests by 500 ms */
            if (rnd.nextInt(2) == 0) {
                /* Delay on average 50% of the requests from client perspective */
                try {
                    
                    logger.info("Injecting 500 ms delay");
                    Thread.sleep(500);
                } catch (InterruptedException ie) {
                    logger.info(ie);
                    throw new RuntimeException(ie);
                }
            }
        }
    }
    
    @Override
    public void afterResponse(Request<?> request, Object resultObject, TimingInfo timingInfo) {

        /* The following is a hit and miss for multi-threaded clients as the cache size is only 50 entries */
        String awsRequestId = dynamoDBClient.getCachedResponseMetadata(request.getOriginalRequest()).getRequestId();
        logger.info("AWS RequestID: " + awsRequestId);
        
        /*
         * Here you could inspect and alter the response object to
         * see how your application behaves for specific data
         */
        if (request.getOriginalRequest() instanceof GetItemRequest) {
            GetItemResult result = (GetItemResult) resultObject;
            
            Map<String, AttributeValue> item = result.getItem();
            
            if (item.get("name").getS().equals("Airplane")) {
                
                // Alter the item
                item.put("name", new AttributeValue("newAirplane"));
                item.put("new attr", new AttributeValue("new attr"));
                
                // Add some delay
                try {
                    Thread.sleep(500);
                } catch (InterruptedException ie) { 
                    logger.info(ie);
                    throw new RuntimeException(ie);
                }
            }
        }
    }
    
    @Override
    public void afterError(Request<?> request, Exception e) {
        
        /* Inspect the error */
        logger.info("Error: " + e);
    }
}
