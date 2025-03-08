# DynamoDB Hedging Pattern Implementation with Java

This project demonstrates the implementation of the hedging pattern with Amazon DynamoDB using the AWS SDK for Java v2. The hedging pattern helps improve tail latency by sending multiple identical requests and using the first response that arrives.

## Concepts

### What is Request Hedging?
Request hedging is a reliability pattern where multiple identical requests are sent to different replicas of a service. The first successful response is used while other requests are canceled. This pattern helps reduce tail latency at the cost of additional resource usage.

### Benefits
- Reduces p99 latency (tail latency)
- Improves reliability by routing around slow DynamoDB replicas
- Handles transient issues automatically

### Trade-offs
- Increased DynamoDB consumed capacity units
- Higher costs due to multiple requests
- Additional client-side complexity

## Project Structure

```
src/
├── main/
│    └── java/
│          └── com/example/dynamodbhedging/
│               ├── DDBHedgingRequestHandler.java  // Generic hedging request handler implementation
│               ├── DynamoDBHedgedQuery.java       // Main class demoestrating the use of hedging
│               └── DynamoDBOperations.java        // DynamoDB operations with hedging
└── test/
    └── java/
        └── com/example/dynamodbhedging/
            └── DynamoDBHedgedQueryTest.java      // Test cases

```
## Getting Started
### Prerequisites

* Java 21 or later

* Maven 

* DynamoDB table created with a partitioned key and sample data loaded

### How to use the DDBHedgingRequestHandler class
```java
    DDBHedgingRequestHandler<QueryResponse> hedgingHandler =  new DDBHedgingRequestHandler();

    // create the DynamoDB operation 
    Map<String, AttributeValue> expressionAttributeValues = new HashMap<>();
    expressionAttributeValues.put(":pkValue", AttributeValue.builder().s(partitionKeyValue).build());
    
    // Create the query request
    QueryRequest queryRequest = QueryRequest.builder().tableName(tableName).keyConditionExpression(partitionKeyName + " = :pkValue").expressionAttributeValues(expressionAttributeValues).build();
    
        // Create the supplier that will execute the query and pass to the hedgeRequests() method of the DDBHedgingRequestHandler class
        return hedgingHandler.hedgeRequests(() -> asyncClient.query(queryRequest), List.of(50) // Delays in milliseconds for hedge requests, you can pass multiple values if you wish to do multiple hedging calls
    );
```

### Running the sample: 

Maven plugin configuration is provided for running the sample class DynamoDBHedgedQuery.
To run this class update the following configurations to suite your environment.

```xml
     <plugin>
        <groupId>org.codehaus.mojo</groupId>
        <artifactId>exec-maven-plugin</artifactId>
        <configuration>
            <mainClass>com.example.dynamodbhedging.DynamoDBHedgedQuery</mainClass>
            <arguments>
               
                <argument><!-- DynamoDB table name --></argument>
                
                <argument><!-- Name of the Partition Key --></argument>
                
                <argument><!-- Partition Key value for the items to retrieve --></argument>
                
                <argument><!-- Number of iterations for the code to run --></argument>
            </arguments>
        </configuration>
    </plugin>
```
After adding this configuration, you can run your main class using:

```bash
mvn exec:java
```

If you need to pass different arguments at runtime, you can override the configured arguments using the command line:

```bash
mvn exec:java -Dexec.args="DynamoBDTableName Partition_Key Key_value number_of_iterations"
```

