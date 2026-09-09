package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.unit.util;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;
import java.util.concurrent.atomic.AtomicInteger;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.exception.BatchWriteRetryExhaustedException;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.util.BatchWriteItemHelper;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;
import software.amazon.awssdk.services.dynamodb.model.BatchWriteItemResponse;
import software.amazon.awssdk.services.dynamodb.model.PutRequest;
import software.amazon.awssdk.services.dynamodb.model.WriteRequest;

/**
 * Unit coverage for successful and exhausted unprocessed-item retry behavior in
 * {@link BatchWriteItemHelper}.
 */
@Tag("unit")
class BatchWriteItemHelperTest {

    private static final Logger LOGGER = LoggerFactory.getLogger(BatchWriteItemHelperTest.class);
    private static final Map<String, List<WriteRequest>> REQUEST_ITEMS = Map.of("table", List.of(writeRequest()));

    @Test
    void writeAllWithRetryWhenNoUnprocessedItemsCompletesSuccessfully() {
        BatchWriteItemHelper.writeAllWithRetry(REQUEST_ITEMS,
                request -> CompletableFuture.completedFuture(BatchWriteItemResponse.builder().build()), LOGGER).join();
    }

    @Test
    void writeAllWithRetryWhenItemsRemainUnprocessedCompletesExceptionally() {
        AtomicInteger callCount = new AtomicInteger();
        BatchWriteItemResponse response = BatchWriteItemResponse.builder()
                .unprocessedItems(REQUEST_ITEMS)
                .build();

        assertThatThrownBy(() -> BatchWriteItemHelper.writeAllWithRetry(REQUEST_ITEMS,
                request -> {
                    callCount.incrementAndGet();
                    return CompletableFuture.completedFuture(response);
                }, LOGGER).join())
                .isInstanceOf(CompletionException.class)
                .hasCauseInstanceOf(BatchWriteRetryExhaustedException.class);
        assertThat(callCount.get()).isEqualTo(BatchWriteItemHelper.MAX_UNPROCESSED_RETRIES + 1);
    }

    /** Returns one minimal write request for retry-loop tests. */
    private static WriteRequest writeRequest() {
        return WriteRequest.builder()
                .putRequest(PutRequest.builder().item(Map.of("PK", AttributeValue.fromS("key"))).build())
                .build();
    }
}
