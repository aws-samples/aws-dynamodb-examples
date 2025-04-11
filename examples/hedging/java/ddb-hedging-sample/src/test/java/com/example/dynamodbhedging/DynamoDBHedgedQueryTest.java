package com.example.dynamodbhedging;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import software.amazon.awssdk.services.dynamodb.DynamoDbAsyncClient;
import software.amazon.awssdk.services.dynamodb.model.QueryResponse;

import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class DynamoDBHedgedQueryTest {

    @Mock
    private DynamoDbAsyncClient mockAsyncClient;
    
    @Mock
    private DDBHedgingRequestHandler<QueryResponse> mockHedgingHandler;
    
    // Class under test - will be initialized in setup with mocks
    private DynamoDBHedgedQuery dynamoDBHedgedQuery;

    // Test constants
    private static final String TEST_TABLE = "hedging-demo-102";
    private static final String TEST_PARTITION_KEY = "PK";
    private static final String TEST_PARTITION_VALUE = "7343-K7Ws6YE0MTfJwQn";
    
    @BeforeEach
    void setUp() {
        // Create a test instance with our mocks
        dynamoDBHedgedQuery = new DynamoDBHedgedQuery(mockAsyncClient, mockHedgingHandler);
    }
    
    @AfterEach
    void tearDown() {
        // Clean up resources
        dynamoDBHedgedQuery.close();
    }
    
    @Test
    void testQueryWithHedging_Success() throws ExecutionException, InterruptedException, TimeoutException {
        // Arrange
        QueryResponse mockResponse = QueryResponse.builder().build();
        CompletableFuture<QueryResponse> futureResponse = CompletableFuture.completedFuture(mockResponse);
        
        // Set up mock behavior for hedgingHandler
        when(mockHedgingHandler.hedgeRequests(any(), any())).thenReturn(futureResponse);
        
        // Act
        CompletableFuture<QueryResponse> result = dynamoDBHedgedQuery.queryWithHedging(TEST_TABLE, TEST_PARTITION_KEY, TEST_PARTITION_VALUE);
        QueryResponse response = result.get(1, TimeUnit.SECONDS);
        
        // Assert
        assertNotNull(response);
        assertEquals(mockResponse, response);
        verify(mockHedgingHandler).hedgeRequests(any(), any());
    }
    
    @Test
    void testQueryWithHedging_HandlesException() {
        // Arrange
        CompletableFuture<QueryResponse> futureWithException = new CompletableFuture<>();
        futureWithException.completeExceptionally(new RuntimeException("DynamoDB connection error"));
        
        when(mockHedgingHandler.hedgeRequests(any(), any())).thenReturn(futureWithException);
        
        // Act & Assert
        CompletableFuture<QueryResponse> result = dynamoDBHedgedQuery.queryWithHedging(TEST_TABLE, TEST_PARTITION_KEY, TEST_PARTITION_VALUE);
        
        ExecutionException exception = assertThrows(ExecutionException.class, () -> result.get(1, TimeUnit.SECONDS));

        assertInstanceOf(RuntimeException.class, exception.getCause());
        assertEquals("DynamoDB connection error", exception.getCause().getMessage());
    }
    
    @Test
    void testClose_CallsUnderlyingResourcesClose() {
        // Act
        dynamoDBHedgedQuery.close();
        
        // Assert
        verify(mockHedgingHandler).shutdownAndAwaitTermination(anyLong(), any());
        verify(mockAsyncClient).close();
    }
    
    @Test
    void testQueryWithHedging_VerifiesCorrectRequestParameters() {
        // Arrange
        CompletableFuture<QueryResponse> future = CompletableFuture.completedFuture(QueryResponse.builder().build());
        when(mockHedgingHandler.hedgeRequests(any(), any())).thenReturn(future);
        
        // Act
        dynamoDBHedgedQuery.queryWithHedging(TEST_TABLE, TEST_PARTITION_KEY, TEST_PARTITION_VALUE);
        
        // Assert
        // Capture the supplier argument passed to hedgeRequests
        verify(mockHedgingHandler).hedgeRequests(any(), eq(List.of(50)));
    }
    
    @Test
    void testDefaultConstructor() {
        // This test verifies that the default constructor creates working instances
        // We can't easily test the internals, but we can verify no exceptions occur
        
        // Act & Assert - no exceptions should be thrown
        DynamoDBHedgedQuery instance = new DynamoDBHedgedQuery();
        assertNotNull(instance);
        
        // Clean up
        instance.close();
    }
}