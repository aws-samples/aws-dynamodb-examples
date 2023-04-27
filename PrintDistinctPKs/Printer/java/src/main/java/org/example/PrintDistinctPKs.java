package org.example;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;

import software.amazon.awssdk.core.SdkBytes;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;
import software.amazon.awssdk.services.dynamodb.model.DescribeTableRequest;
import software.amazon.awssdk.services.dynamodb.model.DescribeTableResponse;
import software.amazon.awssdk.services.dynamodb.model.DynamoDbException;
import software.amazon.awssdk.services.dynamodb.model.ScanRequest;
import software.amazon.awssdk.services.dynamodb.model.ScanResponse;

import software.amazon.awssdk.services.dynamodb.model.*;
import software.amazon.awssdk.core.SdkBytes;
import software.amazon.awssdk.core.exception.SdkException;
import software.amazon.awssdk.services.sts.StsClient;
import software.amazon.awssdk.services.sts.model.GetCallerIdentityRequest;
import software.amazon.awssdk.services.sts.model.GetCallerIdentityResponse;

public class PrintDistinctPKs {

    static DynamoDbClient dynamoDb;

    public static void main(String[] args) {
        String tableName;
        String region;

        if (args.length != 4 || !args[0].equals("--table-name") || !args[2].equals("--region")) {
            System.out.println("Error: --table-name and --region params not passed, checking AWS_DEFAULT_REGION and DYNAMODB_TABLE_NAME environment variables.");

            // If they didn't pass the table name and region on the command line, see if they
            //  passed it in environment variables
            region = System.getenv("AWS_DEFAULT_REGION");

            if (region == null || region.isEmpty()) {
                System.out.println("Error: AWS_DEFAULT_REGION environment variable is not set.");
                System.exit(1);
            } else {
                software.amazon.awssdk.regions.Region awsRegion = null;

                try {
                    awsRegion = software.amazon.awssdk.regions.Region.of(region);
                } catch (IllegalArgumentException e) {
                    System.out.println("Error: Invalid AWS region specified in AWS_DEFAULT_REGION.");
                    System.exit(1);
                }

                dynamoDb = DynamoDbClient.builder().region(awsRegion).build();

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
            }

            tableName  = System.getenv("DYNAMODB_TABLE_NAME");
            if (tableName == null || tableName.isEmpty()) {
                System.out.println("Error: DYNAMODB_TABLE_NAME environment variable is not set.");
                System.exit(1);
            }
        } else {
            tableName = args[1];
            region = args[3];
        }

        printDistinctPKs(Region.of(region), tableName);
    }

    public static void printDistinctPKs(Region awsRegion, String tableName) {
        DynamoDbClient dynamoDb = DynamoDbClient.builder().region(awsRegion).build();

        DescribeTableResponse table = dynamoDb.describeTable(DescribeTableRequest.builder().tableName(tableName).build());
        String partitionKeyName = table.table().keySchema().get(0).attributeName();
        if (table.table().keySchema().size() == 1) {
            throw new RuntimeException("Table needs to be a hash/range table");
        }
        String sortKeyName = table.table().keySchema().get(1).attributeName();
        String sortKeyType = table.table().attributeDefinitions().stream()
                .filter(attr -> attr.attributeName().equals(sortKeyName))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Could not find schema for attribute name: " + sortKeyName))
                .attributeType().toString();

        // We need to create a string that is encoded in UTF-8 to 1024 bytes of the highest
        // code point.  This is 256 code points.  Each code point is a 4 byte value in UTF-8.
        // In Java, the code point needs to be specified as a surrogate pair of characters, thus
        // 512 characters.
        StringBuilder sb = new StringBuilder(512);
        for (int i = 0; i < 256; i++) {
            sb.append("\uDBFF\uDFFF");
        }

        String maxSortKeyValueS = sb.toString();
        String maxSortKeyValueN = "9.9999999999999999999999999999999999999E+125";
        byte[] maxBytes = new byte[1024];
        Arrays.fill(maxBytes, (byte)0xFF);
        SdkBytes maxSortKeyValueB = SdkBytes.fromByteArray(maxBytes);

        Map<String, AttributeValue> lastEvaluatedKey = null;

        while (true) {
            try {
                ScanRequest.Builder scanRequestBuilder = ScanRequest.builder()
                        .tableName(tableName)
                        .limit(1)
                        .exclusiveStartKey(lastEvaluatedKey)
                        .projectionExpression("pk");

                ScanResponse response = dynamoDb.scan(scanRequestBuilder.build());
                if (!response.items().isEmpty()) {
                    System.out.println(response.items().get(0).get(partitionKeyName).s());
                }

                if (!response.hasLastEvaluatedKey()) {
                    break;
                }
                lastEvaluatedKey = response.lastEvaluatedKey();

                AttributeValue maxSortKeyValue;
                switch (sortKeyType) {
                    case "S":
                        maxSortKeyValue = AttributeValue.builder().s(maxSortKeyValueS).build();
                        break;
                    case "N":
                        maxSortKeyValue = AttributeValue.builder().n(maxSortKeyValueN).build();
                        break;
                    case "B":
                        maxSortKeyValue = AttributeValue.builder().b(maxSortKeyValueB).build();
                        break;
                    default:
                        throw new RuntimeException("Unsupported sort key type: " + sortKeyType);
                }

                lastEvaluatedKey = new HashMap<>(lastEvaluatedKey);
                lastEvaluatedKey.put(sortKeyName, maxSortKeyValue);
            } catch (DynamoDbException e) {
                if (e.awsErrorDetails().errorCode().equals("InternalServerError")
                        || e.awsErrorDetails().errorCode().equals("ThrottlingException")) {
                    System.err.println("Received an error: " + e.awsErrorDetails().errorCode() + ", retrying...");
                    try {
                        Thread.sleep(1000);
                    } catch (InterruptedException interruptedException) {
                        break;
                    }
                } else {
                    throw e;
                }
            }
        }
    }
}

