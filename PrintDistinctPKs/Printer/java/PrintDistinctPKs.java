import software.amazon.awssdk.core.SdkBytes;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.*;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

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
        String sortKeyName = table.table().keySchema().get(1).attributeName();
        String sortKeyType = table.table().attributeDefinitions().stream()
                .filter(attr -> attr.attributeName().equals(sortKeyName))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Unsupported sort key type: " + sortKeyName))
                .attributeType().toString();

        String maxSortKeyValueS = new String(new char[256]).replace("\0", "\uDBFF\uDFFF");
        String maxSortKeyValueN = "9.9999999999999999999999999999999999999E+125";
        SdkBytes maxSortKeyValueB = SdkBytes.fromByteArray(new byte[1024]);

        Map<String, AttributeValue> lastEvaluatedKey = null;

        while (true) {
            try {
                ScanRequest.Builder scanRequestBuilder = ScanRequest.builder()
                        .tableName(tableName)
                        .limit(1)
                        .exclusiveStartKey(lastEvaluatedKey);

                ScanResponse response = dynamoDb.scan(scanRequestBuilder.build());
                if (!response.items().isEmpty()) {
                    System.out.println(response.items().get(0).get("pk").s());
                }

                lastEvaluatedKey = response.lastEvaluatedKey();
                if (lastEvaluatedKey == null || lastEvaluatedKey.isEmpty()) {
                    break;
                }

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
                       

