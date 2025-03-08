package com.example.dynamodbhedging;

import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.dynamodb.DynamoDbAsyncClient;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;
import software.amazon.awssdk.services.dynamodb.model.QueryRequest;
import software.amazon.awssdk.services.dynamodb.model.QueryResponse;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

public class DynamoDBHedgedQuery {

    //Initialize the logger
    private static final org.slf4j.Logger logger = org.slf4j.LoggerFactory.getLogger(DynamoDBHedgedQuery.class);

    private final DynamoDbAsyncClient asyncClient;
    private final DDBHedgingRequestHandler<QueryResponse> hedgingHandler;

    public DynamoDBHedgedQuery() {
        this.asyncClient = DynamoDbAsyncClient.builder().region(Region.US_EAST_1).build();
        this.hedgingHandler = new DDBHedgingRequestHandler<>();
    }
    
    // Constructor for testing purposes
    public DynamoDBHedgedQuery(DynamoDbAsyncClient asyncClient, DDBHedgingRequestHandler<QueryResponse> hedgingHandler) {
        this.asyncClient = asyncClient;
        this.hedgingHandler = hedgingHandler;
    }

    public CompletableFuture<QueryResponse> queryWithHedging(String tableName, String partitionKeyName, String partitionKeyValue) {
        // Create expression attribute values
        Map<String, AttributeValue> expressionAttributeValues = new HashMap<>();
        expressionAttributeValues.put(":pkValue", AttributeValue.builder().s(partitionKeyValue).build());

        // Create the query request
        QueryRequest queryRequest = QueryRequest.builder().tableName(tableName).keyConditionExpression(partitionKeyName + " = :pkValue").expressionAttributeValues(expressionAttributeValues).build();

        // Create the supplier that will execute the query
        return hedgingHandler.hedgeRequests(() -> asyncClient.query(queryRequest), List.of(50) // Delays in milliseconds for hedge requests
        );
    }


    public static void main(String[] args) {
        final String USAGE = "\n" + "Usage:\n" + "    DynamoDBHedgedQuery <table> <key> <keyVal>\n\n" + "Where:\n" + "    table - the table from which items are queried (i.e., Music3)\n" + "    key -  the partition key name used in the table (i.e., Artist) \n" + "    keyval  - the partition key value to query for (i.e., Famous Band)\n" + " Example:\n" + "    Music3 Artist 'Famous Band'\n" + "  **Warning** This program will actually query items\n" + "            that you specify!\n";

        if (args.length < 3) {
            System.out.println(USAGE);
            System.exit(1);
        }

        String tableName = args[0];
        String key = args[1];
        String keyVal = args[2];
        int numOfIterations =  Integer.parseInt(args[3]);
        System.out.println("numOfIterations: " + numOfIterations);

        DynamoDBHedgedQuery hedgedQuery = new DynamoDBHedgedQuery();

        try {
            for (int i = 0; i < numOfIterations; i++) {

                // Start timing
                long startTime = System.nanoTime();

                CompletableFuture<QueryResponse> futureResponse = hedgedQuery.queryWithHedging(tableName, key, keyVal);


                // Wait for the response and process it
                QueryResponse response = futureResponse.get(1, TimeUnit.SECONDS);

                logger.info("Number of items retrieved: {}", response.count());

                // End timing and calculate total duration
                long endTime = System.nanoTime();
                long totalDurationMillis = TimeUnit.NANOSECONDS.toMillis(endTime - startTime);

// Log the timing breakdown
                logger.info("Total execution time: {} milliseconds", totalDurationMillis);
            }

        } catch (Exception e) {
            System.err.println("Error querying items:");
            System.err.println(e.getMessage());
            System.exit(1);
        } finally {
            hedgedQuery.close();
        }
    }


    // Clean up resources
    public void close() {
        try {
            // First shutdown the hedging handler
            hedgingHandler.shutdownAndAwaitTermination(5, TimeUnit.SECONDS);

            // Then close the DynamoDB client
            asyncClient.close();
        } catch (Exception e) {
            logger.error("Error during shutdown", e);
        }
    }
}
