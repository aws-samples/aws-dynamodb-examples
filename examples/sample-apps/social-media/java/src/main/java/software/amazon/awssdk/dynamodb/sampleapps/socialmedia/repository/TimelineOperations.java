package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

import org.slf4j.Logger;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.TimelineEntry;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.util.DynamoDbSchema;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.util.PaginationTokenCodec;
import software.amazon.awssdk.enhanced.dynamodb.TableSchema;
import software.amazon.awssdk.services.dynamodb.DynamoDbAsyncClient;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;
import software.amazon.awssdk.services.dynamodb.model.QueryRequest;

/**
 * Shared Timelines table operations used by both {@link TimelineRepository} implementations.
 *
 * <p>Fan-out is a chunked {@code BatchWriteItem} and the read is a {@code Query} on the composite
 * {@code GSI_TIMELINE}. Neither operation uses the enhanced-client mapping beyond
 * {@link TableSchema} attribute conversion, so the two client types delegate here and differ only in
 * how they obtain the low-level async client and in the startup wiring.
 */
final class TimelineOperations {

static final String TIMELINE_TOKEN_DISCRIMINATOR = DynamoDbSchema.TIMELINE_POST_ID;

    private static final TableSchema<TimelineEntry> SCHEMA = TableSchema.fromBean(TimelineEntry.class);

    /** Utility class, not instantiated. */
    private TimelineOperations() {
    }

    /**
     * Fans out timeline entries in chunks, draining {@code UnprocessedItems}.
     *
     * @param client    low-level async client
     * @param tableName Timelines table name
     * @param entries   one entry per recipient
     * @param chunkSize configured chunk size (hard-capped at 25)
     * @param logger    logger for retry-exhaustion diagnostics
     * @return future completing when every entry is written
     */
    static CompletableFuture<Void> fanOut(DynamoDbAsyncClient client,
                                          String tableName,
                                          List<TimelineEntry> entries,
                                          int chunkSize,
                                          Logger logger) {
        List<Map<String, AttributeValue>> itemMaps = new ArrayList<>();
        for (TimelineEntry entry : entries) {
            itemMaps.add(SCHEMA.itemToMap(entry, true));
        }
        return FanOutWriter.writeChunked(client, tableName, itemMaps, chunkSize, logger);
    }

    /**
     * Reads one timeline page via a {@code Query} on {@code GSI_TIMELINE}.
     *
     * @param client           low-level async client
     * @param tableName        Timelines table name
     * @param userId           timeline owner (GSI partition value)
     * @param limit            maximum items per page
     * @param scanIndexForward traversal direction
     * @param nextToken        opaque continuation, or {@code null} for the first page
     * @return a page of timeline entries plus an optional next-page token
     */
    static CompletableFuture<TimelinePage> queryTimeline(DynamoDbAsyncClient client,
                                                         String tableName,
                                                         String userId,
                                                         int limit,
                                                         boolean scanIndexForward,
                                                         String nextToken) {
        QueryRequest.Builder builder = QueryRequest.builder()
                .tableName(tableName)
                .indexName(DynamoDbSchema.GSI_TIMELINE)
                .keyConditionExpression(DynamoDbSchema.TIMELINE_USER_ID + " = :u")
                .expressionAttributeValues(Map.of(":u", AttributeValue.fromS(userId)))
                .scanIndexForward(scanIndexForward)
                .limit(limit);

        Map<String, AttributeValue> exclusiveStartKey = PaginationTokenCodec.decode(nextToken);
        if (exclusiveStartKey != null) {
            PaginationTokenCodec.requireKeyAttribute(exclusiveStartKey, TIMELINE_TOKEN_DISCRIMINATOR, nextToken);
            PaginationTokenCodec.requireCompleteKey(
                    exclusiveStartKey, DynamoDbSchema.TIMELINE_CONTINUATION_KEY, nextToken);
            builder.exclusiveStartKey(exclusiveStartKey);
        }

        return GsiPageReader.queryPage(client, builder.build()).thenApply(page -> {
            List<TimelineEntry> items = new ArrayList<>();
            page.items().forEach(item -> items.add(SCHEMA.mapToItem(item)));
            return new TimelinePage(items, PaginationTokenCodec.encode(page.lastEvaluatedKey()));
        });
    }
}
