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
│   ├── java/
│   │   └── com/example/dynamodbhedging/
│   │       ├── DDBHedgingRequestHandler.java  // Generic hedging request handler implementation
│   │       ├── DynamoDBHedgedQuery.java       // Main class demoestrating the use of hedging
│   │       └── DynamoDBOperations.java        // DynamoDB operations with hedging
│   └── resources/
│           ├── congig.properties
│           └── log4j.properties 
└── test/
    └── java/
        └── com/example/dynamodbhedging/
            └── DynamoDBHedgingTest.java      // Test cases

```
### Getting Started
#### Prerequisites

* Java 8 or later

* Maven or Gradle

* AWS credentials configured

* DynamoDB table created

#### Configuration
Upddate the config.properties file in src/main/resources:
```
tableName = Your DynamoDB table name
key = Partition Key name
keyVal = Partition Key value
```


### Usage Example
```java
    // Create expression attribute values
    Map<String, AttributeValue> expressionAttributeValues = new HashMap<>();
    expressionAttributeValues.put(":pkValue", AttributeValue.builder().s(partitionKeyValue).build());
    
    // Create the query request
    QueryRequest queryRequest = QueryRequest.builder().tableName(tableName).keyConditionExpression(partitionKeyName + " = :pkValue").expressionAttributeValues(expressionAttributeValues).build();
    
        // Create the supplier that will execute the query
        return hedgingHandler.hedgeRequests(() -> asyncClient.query(queryRequest), List.of(50) // Delays in milliseconds for hedge requests
    );
```
Running Tests
The project includes comprehensive tests demonstrating hedging behavior:

mvn test

Test scenarios include:

Basic hedging functionality

Latency improvement verification

Error handling

Resource cleanup

Test Configuration
Before running tests, configure these values in src/test/resources/test-config.properties:

tableName - DynamoDB table name

partitionKey - Primary key name

sortKey - Sort key name (if applicable)

hedgingDelay - Initial delay before hedging (milliseconds)

maxHedgedRequests - Maximum number of hedged requests

### License
This project is licensed under the Apache License 2.0


This revised README provides a clearer explanation of the hedging pattern and its implementation with DynamoDB, including practical code examples and configuration guidance. It focuses on the key concepts and practical usage while maintaining important information about testing and setup.

The hedging pattern is particularly useful for read-heavy workloads where consistent low latency is critical. The implementation allows developers to make informed de


