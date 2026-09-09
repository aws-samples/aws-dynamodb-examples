package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

import org.slf4j.Logger;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.util.BatchWriteItemHelper;
import software.amazon.awssdk.services.dynamodb.DynamoDbAsyncClient;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;
import software.amazon.awssdk.services.dynamodb.model.PutRequest;
import software.amazon.awssdk.services.dynamodb.model.WriteRequest;

/**
 * Writes a set of items to one table across chunked {@code BatchWriteItem} calls, draining
 * {@code UnprocessedItems} between and within chunks via {@link BatchWriteItemHelper}.
 *
 * <p>Shared by the timeline fan-out and the inbox fan-out so both fan-outs reach
 * every recipient across as many 25-item batches as needed and never silently cap the recipient set
 * at one batch. The chunk size is hard-capped at the DynamoDB batch limit of 25 regardless of the
 * configured value.
 */
final class FanOutWriter {

static final int MAX_BATCH_SIZE = 25;

    /** Utility class, not instantiated. */
    private FanOutWriter() {
    }

    /**
     * Writes every item map in chunks, chaining chunks sequentially.
     *
     * @param client    low-level async client
     * @param tableName target table name
     * @param itemMaps  attribute-value maps to write (one per recipient)
     * @param chunkSize requested chunk size, clamped to {@code 1..25}
     * @param logger    logger for retry-exhaustion diagnostics
     * @return future completing once every item is written or the retry budget is exhausted
     */
    static CompletableFuture<Void> writeChunked(DynamoDbAsyncClient client,
                                                String tableName,
                                                List<Map<String, AttributeValue>> itemMaps,
                                                int chunkSize,
                                                Logger logger) {
        if (itemMaps.isEmpty()) {
            return CompletableFuture.completedFuture(null);
        }
        int effectiveChunk = Math.max(1, Math.min(chunkSize, MAX_BATCH_SIZE));
        List<List<Map<String, AttributeValue>>> chunks = partition(itemMaps, effectiveChunk);
        return writeChunkFrom(client, tableName, chunks, 0, logger);
    }

    /** Writes chunk {@code index} then recurses to the next, so batches do not overlap. */
    private static CompletableFuture<Void> writeChunkFrom(DynamoDbAsyncClient client,
                                                          String tableName,
                                                          List<List<Map<String, AttributeValue>>> chunks,
                                                          int index,
                                                          Logger logger) {
        if (index >= chunks.size()) {
            return CompletableFuture.completedFuture(null);
        }
        List<WriteRequest> writes = new ArrayList<>();
        for (Map<String, AttributeValue> item : chunks.get(index)) {
            writes.add(WriteRequest.builder().putRequest(PutRequest.builder().item(item).build()).build());
        }
        return BatchWriteItemHelper.writeAllWithRetry(Map.of(tableName, writes), client::batchWriteItem, logger)
                .thenCompose(ignored -> writeChunkFrom(client, tableName, chunks, index + 1, logger));
    }

    /** Splits a list into consecutive sublists of at most {@code size} elements. */
    private static <T> List<List<T>> partition(List<T> source, int size) {
        List<List<T>> chunks = new ArrayList<>();
        for (int start = 0; start < source.size(); start += size) {
            chunks.add(new ArrayList<>(source.subList(start, Math.min(start + size, source.size()))));
        }
        return chunks;
    }
}
