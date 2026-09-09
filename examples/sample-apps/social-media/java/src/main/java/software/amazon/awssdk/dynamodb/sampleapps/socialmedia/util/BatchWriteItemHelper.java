package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.util;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import java.util.function.Function;

import org.slf4j.Logger;
import software.amazon.awssdk.retries.api.BackoffStrategy;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.exception.BatchWriteRetryExhaustedException;
import software.amazon.awssdk.services.dynamodb.model.BatchWriteItemRequest;
import software.amazon.awssdk.services.dynamodb.model.BatchWriteItemResponse;
import software.amazon.awssdk.services.dynamodb.model.WriteRequest;

/**
 * Shared utilities for {@code BatchWriteItem} retry orchestration when DynamoDB returns unprocessed
 * items.
 *
 * <p>A {@code BatchWriteItem} call can succeed with HTTP {@code 200} while returning
 * {@code UnprocessedItems}. The AWS SDK does not automatically retry that outcome because the service
 * call completed. Callers must resubmit the remaining write requests after a delay. This helper is
 * used by the  timeline fan-out and the  inbox fan-out so no eligible recipient is
 * silently skipped.
 */
public final class BatchWriteItemHelper {

public static final int MAX_UNPROCESSED_RETRIES = 8;

public static final BackoffStrategy UNPROCESSED_ITEM_BACKOFF =
            BackoffStrategy.exponentialDelay(Duration.ofMillis(50), Duration.ofSeconds(1));

private static final int SDK_ATTEMPT_OFFSET = 2;

    /** Prevents instantiation of this utility type. */
    private BatchWriteItemHelper() {
    }

    /**
     * Computes how long to wait before resubmitting unprocessed items.
     *
     * @param attempt zero-based index of the attempt that produced unprocessed items
     * @return non-negative duration to wait before the next retry
     */
    public static Duration unprocessedItemsDelay(int attempt) {
        return UNPROCESSED_ITEM_BACKOFF.computeDelay(attempt + SDK_ATTEMPT_OFFSET);
    }

    /**
     * Executes a {@code BatchWriteItem} flow, resubmitting only the {@code UnprocessedItems} set
     * until it is empty or the retry cap is reached.
     *
     * @param requestItems initial table name to write-request mapping for the first call
     * @param batchCallFn  async service call implementation for one {@code BatchWriteItem} round
     * @param logger       logger used when retries are exhausted with items still outstanding
     * @return future completing once all items are written, or exceptionally when the retry budget is exhausted
     */
    public static CompletableFuture<Void> writeAllWithRetry(
            Map<String, List<WriteRequest>> requestItems,
            Function<BatchWriteItemRequest, CompletableFuture<BatchWriteItemResponse>> batchCallFn,
            Logger logger) {
        return writeAllWithRetry(requestItems, 0, batchCallFn, logger);
    }

    /**
     * Continues the drain loop for the current write-request set.
     *
     * @param requestItems table name to write-request mapping for the current attempt
     * @param attempt      zero-based attempt index for the next service call
     * @param batchCallFn  async service call implementation for one {@code BatchWriteItem} round
     * @param logger       logger used when retries are exhausted
     * @return future completing once the drain loop finishes, or exceptionally when retries are exhausted
     */
    private static CompletableFuture<Void> writeAllWithRetry(
            Map<String, List<WriteRequest>> requestItems,
            int attempt,
            Function<BatchWriteItemRequest, CompletableFuture<BatchWriteItemResponse>> batchCallFn,
            Logger logger) {
        BatchWriteItemRequest request = BatchWriteItemRequest.builder().requestItems(requestItems).build();
        return batchCallFn.apply(request).thenCompose(response -> {
            Map<String, List<WriteRequest>> unprocessed = response.unprocessedItems();
            if (unprocessed == null || unprocessed.isEmpty()) {
                return CompletableFuture.completedFuture(null);
            }
            if (attempt >= MAX_UNPROCESSED_RETRIES) {
                logger.warn("BatchWriteItem retries exhausted [unprocessedItemCount={}, attemptCount={}]]",
                        countUnprocessedItems(unprocessed), attempt);
                return CompletableFuture.failedFuture(
                        new BatchWriteRetryExhaustedException(countUnprocessedItems(unprocessed)));
            }
            return delayAsync(unprocessedItemsDelay(attempt))
                    .thenCompose(ignored -> writeAllWithRetry(unprocessed, attempt + 1, batchCallFn, logger));
        });
    }

    /**
     * Counts the total number of write requests remaining across every table entry.
     *
     * @param unprocessed table name to write-request mapping from the DynamoDB response
     * @return total number of write requests still outstanding
     */
    private static int countUnprocessedItems(Map<String, List<WriteRequest>> unprocessed) {
        return unprocessed.values().stream().mapToInt(List::size).sum();
    }

    /**
     * Completes asynchronously after the given delay without blocking a request thread.
     *
     * @param delay wall-clock time to wait before completion
     * @return future that completes normally after the delay (or immediately if the delay is zero)
     */
    public static CompletableFuture<Void> delayAsync(Duration delay) {
        long millis = delay.toMillis();
        if (millis <= 0) {
            return CompletableFuture.completedFuture(null);
        }
        return CompletableFuture.runAsync(() -> { }, CompletableFuture.delayedExecutor(millis, TimeUnit.MILLISECONDS));
    }
}
