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

import com.amazonaws.ClientConfiguration;
import com.amazonaws.auth.AWSCredentialsProvider;
import com.amazonaws.services.dynamodbv2.AmazonDynamoDBClient;
import com.amazonaws.services.kinesis.clientlibrary.interfaces.IRecordProcessor;
import com.amazonaws.services.kinesis.clientlibrary.interfaces.IRecordProcessorFactory;

public class StreamsRecordProcessorFactory implements
        IRecordProcessorFactory {

    private final AWSCredentialsProvider dynamoDBCredentials;
    private final String dynamoDBEndpoint;
    private final String tableName;

    public StreamsRecordProcessorFactory(
            AWSCredentialsProvider dynamoDBCredentials,
            String dynamoDBEndpoint,
            String serviceName,
            String tableName) {
        this.dynamoDBCredentials = dynamoDBCredentials;
        this.dynamoDBEndpoint = dynamoDBEndpoint;
        this.tableName = tableName;
    }

    @Override
    public IRecordProcessor createProcessor() {
        AmazonDynamoDBClient dynamoDBClient = new AmazonDynamoDBClient(dynamoDBCredentials, new ClientConfiguration());
        dynamoDBClient.setEndpoint(dynamoDBEndpoint);
        return new StreamsRecordProcessor(dynamoDBClient, tableName);
    }

}
