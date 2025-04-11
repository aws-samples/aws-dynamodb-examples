package com.example.dynamodbhedging;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import java.util.function.Supplier;

/**
 * A generic request handler that implements hedging pattern for DynamoDB requests.
 * Hedging helps improve tail latency by sending multiple identical requests after specified delays
 * and using the first successful response.
 *
 * @param <T> The type of response expected from the requests
 */
public class DDBHedgingRequestHandler<T> {

    // Logger instance for tracking request execution and debugging
    private static final Logger logger = LoggerFactory.getLogger(DDBHedgingRequestHandler.class);

    /**
     * Executes a request with hedging strategy. This method sends an initial request and then
     * sends additional identical requests (hedged requests) after specified delays if the initial
     * request hasn't completed.
     *
     * @param supplier       A supplier that produces the CompletableFuture for the request to be hedged
     * @param delaysInMillis A list of delays (in milliseconds) for when to send subsequent hedged requests.
     *                      Each delay represents the time to wait before sending the next request.
     *                      If null or empty, only the initial request will be sent.
     * @return A CompletableFuture that completes with the first successful response from any of the requests
     */
    public CompletableFuture<T> hedgeRequests(
            Supplier<CompletableFuture<T>> supplier,
            List<Integer> delaysInMillis) {

        // If no delays are specified, just execute a single request without hedging
        if (delaysInMillis == null || delaysInMillis.isEmpty()) {
            return supplier.get();
        }

        // Execute the initial request immediately
        logger.info("Initiating initial request");
        CompletableFuture<T> firstRequest = supplier.get()
                .thenApply(response -> response);

        // Keep track of all requests (initial + hedged) for management
        List<CompletableFuture<T>> allRequests = new ArrayList<>();
        allRequests.add(firstRequest);

        // Create hedged requests for each delay
        for (int i = 0; i < delaysInMillis.size(); i++) {
            // Calculate request number for logging (2 onwards, as 1 is the initial request)
            final int requestNumber = i + 2;

            long delay = delaysInMillis.get(i);

            // Create a new hedged request with specified delay
            CompletableFuture<T> hedgedRequest = CompletableFuture.supplyAsync(() -> {
                logger.info("Check: Before hedged request#{} can be initiated", requestNumber);

                // Before executing a new hedged request, check if any previous request has completed
                CompletableFuture<T> completedFuture = allRequests.stream()
                        .filter(CompletableFuture::isDone)
                        .findFirst()
                        .orElse(null);

                // If a previous request has completed, use its result instead of making a new request
                if (completedFuture != null) {
                    logger.info("Previous request already completed, skipping hedge request#{}", requestNumber);
                    return completedFuture.join();
                }

                // Execute the hedged request if no previous request has completed
                logger.info("Initiating hedge request#{}", requestNumber);
                return supplier.get()
                        .thenApply(response -> {
                            // Pass through the successful response
                            return response;
                        })
                        .exceptionally(throwable -> {
                            // If this hedged request fails, fall back to the result of the first request
                            logger.warn("Hedged request#{} failed: {}", requestNumber, throwable.getMessage());
                            return firstRequest.join();
                        })
                        .join();
            }, CompletableFuture.delayedExecutor(delay, TimeUnit.MILLISECONDS));

            // Add the hedged request to the list of all requests
            allRequests.add(hedgedRequest);
        }

        // Return a future that completes when any of the request completes successfully
        return CompletableFuture.anyOf(allRequests.toArray(new CompletableFuture[0]))
                .thenApply(result -> {
                    // Cast the result to the expected type
                    T response = (T) result;
                    // Clean up by cancelling any remaining pending requests
                    cancelPendingRequests(allRequests);
                    return response;
                });
    }

    /**
     * Cancels all pending requests that haven't completed yet.
     * This is called after receiving the first successful response to avoid unnecessary processing.
     *
     * @param allRequests List of all CompletableFuture requests that were initiated
     */
    private void cancelPendingRequests(List<CompletableFuture<T>> allRequests) {
        logger.info("Cancelling pending requests");
        // Iterate through all requests and cancel those that haven't completed
        allRequests.forEach(request -> {
            if (!request.isDone()) {
                request.cancel(true);
            }
        });
    }
}
