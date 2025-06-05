package org.example;

import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.*;
import software.amazon.awssdk.core.SdkBytes;
import software.amazon.awssdk.core.exception.SdkException;
import software.amazon.awssdk.services.sts.StsClient;
import software.amazon.awssdk.services.sts.model.GetCallerIdentityRequest;
import software.amazon.awssdk.services.sts.model.GetCallerIdentityResponse;
import software.amazon.awssdk.regions.Region;


import java.util.Arrays;
import java.util.Map;

public class LoadMaxValues {
    private static final String S_TABLE_NAME = "max-str-sk-test-java";
    private static final String N_TABLE_NAME = "max-num-sk-test-java";
    private static final String B_TABLE_NAME = "max-bin-sk-test-java";

    private static AttributeValue MAX_SORT_KEY_VALUE_S;
    private static AttributeValue MAX_SORT_KEY_VALUE_N;
    private static AttributeValue MAX_SORT_KEY_VALUE_B;

    private static DynamoDbClient dynamoDb;
    private static Region awsRegion;

    public static void main(String[] args) {

        String tableName;
        String region;

        if (args.length != 2 || !args[0].equals("--region")) {
            System.out.println("Error: --region param not passed, checking AWS_DEFAULT_REGION environment variable.");

            // If they didn't pass the table name and region on the command line, see if they
            //  passed it in environment variables
            region = System.getenv("AWS_DEFAULT_REGION");

            if (region == null || region.isEmpty()) {
                System.out.println("Error: AWS_DEFAULT_REGION environment variable is not set.");
                System.exit(1);
            } 
        } else {
            region = args[1];    
        }

        try {
            awsRegion = Region.of(region);
        } catch (IllegalArgumentException e) {
            System.out.println("Error: Invalid AWS region specified in AWS_DEFAULT_REGION.");
            System.exit(1);
        }

        // Validate region by making an API call to AWS STS service
        try {
            StsClient stsClient = StsClient.builder().region(awsRegion).build();
            GetCallerIdentityRequest request = GetCallerIdentityRequest.builder().build();
            GetCallerIdentityResponse response = stsClient.getCallerIdentity(request);
            System.out.println("Region is valid. Account ID: " + response.account());
        } catch (SdkException e) {
            System.out.println("Error: Unable to validate region. Check your AWS credentials and region.");
            System.exit(1);
        }

        Initialize DynamoDB client.
        dynamoDb = DynamoDbClient.builder().region(awsRegion).build();
    
        // We need to create a string that is encoded in UTF-8 to 1024 bytes of the highest
        // code point.  This is 256 code points.  Each code point is a 4 byte value in UTF-8.
        // In Java, the code point needs to be specified as a surrogate pair of characters, thus
        // 512 characters.
        StringBuilder sb = new StringBuilder(512);
        for (int i = 0; i < 256; i++) {
            sb.append("\uDBFF\uDFFF");
        }

        MAX_SORT_KEY_VALUE_S = AttributeValue.builder().s(sb.toString()).build();
        MAX_SORT_KEY_VALUE_N = AttributeValue.builder().n("9.9999999999999999999999999999999999999E+125").build();
        byte[] maxBytes = new byte[1024];
        Arrays.fill(maxBytes, (byte) 0xFF);
        MAX_SORT_KEY_VALUE_B = AttributeValue.builder().b(SdkBytes.fromByteArray(maxBytes)).build();

        createTable(S_TABLE_NAME, ScalarAttributeType.S);
        createTable(N_TABLE_NAME, ScalarAttributeType.N);
        createTable(B_TABLE_NAME, ScalarAttributeType.B);
        waitForTablesReady();
        insertItem(S_TABLE_NAME, MAX_SORT_KEY_VALUE_S);
        insertItem(N_TABLE_NAME, MAX_SORT_KEY_VALUE_N);
        insertItem(B_TABLE_NAME, MAX_SORT_KEY_VALUE_B);
    }

    private static void createTable(String tableName, ScalarAttributeType skType) {
        CreateTableRequest createTableRequest = CreateTableRequest.builder()
                .tableName(tableName)
                .keySchema(Arrays.asList(KeySchemaElement.builder().attributeName("pk").keyType(KeyType.HASH).build(),
                        KeySchemaElement.builder().attributeName("sk").keyType(KeyType.RANGE).build()))
                .attributeDefinitions(Arrays.asList(AttributeDefinition.builder().attributeName("pk").attributeType(ScalarAttributeType.S).build(),
                        AttributeDefinition.builder().attributeName("sk").attributeType(skType).build()))
                .billingMode(BillingMode.PAY_PER_REQUEST)
                .build();

        try {
            System.out.printf("Creating Table %s%n", tableName);
            dynamoDb.createTable(createTableRequest);
            System.out.printf("Table %s created successfully%n", tableName);
        } catch (Exception error) {
            System.out.println("Error creating table: " + error);
        }
    }

    private static void waitForTablesReady() {
        for (String tableName : Arrays.asList(S_TABLE_NAME, N_TABLE_NAME, B_TABLE_NAME)) {
            System.out.printf("Waiting for Table %s to be ready%n", tableName);
            while (true) {
                DescribeTableResponse table = dynamoDb.describeTable(DescribeTableRequest.builder().tableName(tableName).build());
                if (table.table().tableStatus().equals(TableStatus.ACTIVE)) {
                    System.out.printf("Table %s is ready%n", tableName);
                    break;
                } else {
                    try {
                        Thread.sleep(1000);
                    } catch (InterruptedException e) {
                        e.printStackTrace();
                    }
                }
            }
        }
    }

    private static void insertItem(String tableName, AttributeValue skValue) {
        PutItemRequest putItemRequest = PutItemRequest.builder()
                .tableName(tableName)
                .item(Map.of(
                        "pk", AttributeValue.builder().s("sample-pk-value").build(),
                        "sk", skValue)).build();
        dynamoDb.putItem(putItemRequest);
    }
}
