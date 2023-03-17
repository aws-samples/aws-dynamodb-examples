import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.*;
import software.amazon.awssdk.core.SdkBytes;

import java.math.BigDecimal;
import java.util.Arrays;

public class LoadMaxValues {
    private static final String S_TABLE_NAME = "max-str-sk-test-java";
    private static final String N_TABLE_NAME = "max-num-sk-test-java";
    private static final String B_TABLE_NAME = "max-bin-sk-test-java";

    private static final String MAX_SORT_KEY_VALUE_S = String.valueOf(new char[256]).replace("\0", "\uDBFF\uDFFF");
    private static final BigDecimal MAX_SORT_KEY_VALUE_N = new BigDecimal("9.9999999999999999999999999999999999999E+125");
    private static final SdkBytes MAX_SORT_KEY_VALUE_B = SdkBytes.fromByteArray(new byte[1024]);

    private static DynamoDbClient dynamoDb;

    public static void main(String[] args) {
        String region = args[0];
        dynamoDb = DynamoDbClient.builder().region(software.amazon.awssdk.regions.Region.of(region)).build();

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

    private static void insertItem(String tableName, Object skValue) {
        PutItemRequest putItemRequest = PutItemRequest.builder()
                .tableName(tableName)
                .item(Map.of(
                        "pk", AttributeValue.builder().s("sample-pk-value").build(),
                        "sk", skValue instanceof String ? AttributeValue.builder().s((String) skValue).build()
                                : skValue

