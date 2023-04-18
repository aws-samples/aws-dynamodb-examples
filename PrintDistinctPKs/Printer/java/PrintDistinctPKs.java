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

public class PrintDistinctPKs {
    public static void main(String[] args) {
        if (args.length != 4 || !args[0].equals("--table-name") || !args[2].equals("--region")) {
            System.err.println("Usage: java PrintDistinctPKs --table-name <tableName> --region <region>");
            System.exit(1);
        }

        String tableName = args[1];
        String region = args[3];
        printDistinctPKs(Region.of(region), tableName);
    }

    public static void printDistinctPKs(Region region, String tableName) {
        DynamoDbClient dynamoDb = DynamoDbClient.builder().region(region).build();

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
                        .exclusiveStartKey(lastEvaluatedKey);

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

