package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.stream;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.function.Function;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import software.amazon.awssdk.services.dynamodb.DynamoDbAsyncClient;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;
import software.amazon.awssdk.services.dynamodb.model.DescribeStreamRequest;
import software.amazon.awssdk.services.dynamodb.model.DescribeStreamResponse;
import software.amazon.awssdk.services.dynamodb.model.GetRecordsRequest;
import software.amazon.awssdk.services.dynamodb.model.GetRecordsResponse;
import software.amazon.awssdk.services.dynamodb.model.GetShardIteratorRequest;
import software.amazon.awssdk.services.dynamodb.model.OperationType;
import software.amazon.awssdk.services.dynamodb.model.Record;
import software.amazon.awssdk.services.dynamodb.model.Shard;
import software.amazon.awssdk.services.dynamodb.model.ShardIteratorType;
import software.amazon.awssdk.services.dynamodb.streams.DynamoDbStreamsAsyncClient;

/**
 * Polls a single DynamoDB Streams source, filters it to one entity shape on {@code INSERT}, and hands
 * each matching new image to a projection handler.
 *
 * <p>One poller instance backs one source table stream (Content or Messages). Shard iterators,
 * last processed sequence numbers, and retry counts live only in this process. They are not written
 * to DynamoDB or any other store, and a restart discards them. Opening a shard from
 * {@link ShardIteratorType#LATEST} therefore skips records produced while this process was down.
 * {@link ShardIteratorType#TRIM_HORIZON} replays from the oldest retained record instead. Two
 * processes that poll the same stream can each project the same insert. Idempotent projection writes
 * absorb those duplicates. This poller is not a production stream processor.
 *
 * <p>It resolves the stream ARN lazily on the first tick (so it tolerates the tables being created
 * shortly after startup), discovers shards through paged {@code DescribeStream}, opens an iterator
 * per shard from {@link ShardIteratorType#LATEST} or {@link ShardIteratorType#TRIM_HORIZON}, drains
 * records with bounded {@code GetRecords} rounds, and renews an expired iterator from the last
 * processed sequence. Records are processed in order within a shard. There is no cross-shard ordering
 * guarantee, which is safe because every projected write is idempotent.
 *
 * <p>A record that keeps failing is retried up to {@link StreamProcessingConstants#MAX_PROCESS_RETRIES}
 * and then skipped (poison-pill) so the shard is not blocked. That skip drops the projection for the
 * insert. A shard checkpoint advances only after a record is processed successfully or is skipped as
 * a poison-pill. The retry counters live in a bounded, access-ordered LRU capped at
 * {@link StreamProcessingConstants#MAX_RETRY_COUNT_ENTRIES}.
 *
 * <p>All DynamoDB stream calls use the async clients. The poller composes those futures and joins at
 * the tick boundary on its dedicated scheduler thread, which preserves in-shard ordering without
 * blocking any HTTP worker thread.
 */
public class StreamSourcePoller {

    private static final Logger logger = LoggerFactory.getLogger(StreamSourcePoller.class);

private static final String ENTITY_TYPE_ATTRIBUTE = "entityType";

private final String sourceName;
private final String tableName;
private final String entityTypeFilter;
private final Function<Map<String, AttributeValue>, CompletableFuture<Void>> handler;
private final ShardIteratorType initialIteratorType;

private final DynamoDbAsyncClient dynamoDbAsyncClient;
private final DynamoDbStreamsAsyncClient streamsClient;

private String streamArn;
private final Map<String, String> shardIterators = new LinkedHashMap<>();
private final Map<String, String> lastSequenceNumbers = new LinkedHashMap<>();
private final Map<String, Integer> retryCounts = new LinkedHashMap<>(16, 0.75f, true) {
        @Override
        protected boolean removeEldestEntry(Map.Entry<String, Integer> eldest) {
            return size() > StreamProcessingConstants.MAX_RETRY_COUNT_ENTRIES;
        }
    };

    /**
     * @param sourceName          human-readable source label for logs
     * @param tableName           table whose stream is consumed
     * @param entityTypeFilter    entity shape kept from the stream
     * @param handler             projection invoked with each matching new image
     * @param initialIteratorType initial iterator type when no checkpoint exists
     * @param dynamoDbAsyncClient low-level client for stream-ARN resolution
     * @param streamsClient       streams client for polling
     */
    public StreamSourcePoller(String sourceName,
                       String tableName,
                       String entityTypeFilter,
                       Function<Map<String, AttributeValue>, CompletableFuture<Void>> handler,
                       ShardIteratorType initialIteratorType,
                       DynamoDbAsyncClient dynamoDbAsyncClient,
                       DynamoDbStreamsAsyncClient streamsClient) {
        this.sourceName = sourceName;
        this.tableName = tableName;
        this.entityTypeFilter = entityTypeFilter;
        this.handler = handler;
        this.initialIteratorType = initialIteratorType;
        this.dynamoDbAsyncClient = dynamoDbAsyncClient;
        this.streamsClient = streamsClient;
    }

    /**
     * Runs one poll tick: ensures the stream ARN, discovers shards, and drains each active shard. Any
     * unexpected failure is logged and swallowed so the scheduler keeps ticking.
     */
    public void pollOnce() {
        try {
            if (!ensureStreamArn()) {
                return;
            }
            discoverShards();
            for (Map.Entry<String, String> entry : new ArrayList<>(shardIterators.entrySet())) {
                drainShard(entry.getKey());
            }
        } catch (Exception e) {
            logger.warn("Stream poll tick failed, will retry next interval [source={}, reason={}]",
                    sourceName, e.getMessage());
        }
    }

    /** Resolves the table's latest stream ARN once, tolerating a not-yet-created table at startup. */
    private boolean ensureStreamArn() {
        if (streamArn != null) {
            return true;
        }
        try {
            streamArn = dynamoDbAsyncClient.describeTable(r -> r.tableName(tableName)).join()
                    .table().latestStreamArn();
            if (streamArn == null) {
                logger.debug("Stream not yet available, retrying [source={}, table={}]", sourceName, tableName);
                return false;
            }
            logger.info("Resolved stream [source={}, table={}]", sourceName, tableName);
            return true;
        } catch (Exception e) {
            logger.debug("Could not resolve stream yet, retrying [source={}, table={}, reason={}]",
                    sourceName, tableName, e.getMessage());
            return false;
        }
    }

    /**
     * Pages {@code DescribeStream} via {@code exclusiveStartShardId} until {@code lastEvaluatedShardId}
     * is null, opening an iterator for each new shard and pruning checkpoints for shards that are gone.
     */
    private void discoverShards() {
        List<Shard> shards = new ArrayList<>();
        String exclusiveStartShardId = null;
        do {
            DescribeStreamRequest.Builder request = DescribeStreamRequest.builder().streamArn(streamArn);
            if (exclusiveStartShardId != null) {
                request.exclusiveStartShardId(exclusiveStartShardId);
            }
            DescribeStreamResponse response = streamsClient.describeStream(request.build()).join();
            shards.addAll(response.streamDescription().shards());
            exclusiveStartShardId = response.streamDescription().lastEvaluatedShardId();
        } while (exclusiveStartShardId != null);

        List<String> liveShardIds = new ArrayList<>();
        for (Shard shard : shards) {
            liveShardIds.add(shard.shardId());
            if (!shardIterators.containsKey(shard.shardId())) {
                openIterator(shard.shardId(), initialIteratorType, null);
            }
        }
        // Prune stale-shard checkpoints each pass.
        shardIterators.keySet().removeIf(shardId -> !liveShardIds.contains(shardId));
        lastSequenceNumbers.keySet().removeIf(shardId -> !liveShardIds.contains(shardId));
    }

    /** Opens (or renews) a shard iterator of the given type, optionally from a sequence number. */
    private void openIterator(String shardId, ShardIteratorType type, String sequenceNumber) {
        GetShardIteratorRequest.Builder request = GetShardIteratorRequest.builder()
                .streamArn(streamArn)
                .shardId(shardId)
                .shardIteratorType(type);
        if (sequenceNumber != null) {
            request.sequenceNumber(sequenceNumber);
        }
        String iterator = streamsClient.getShardIterator(request.build()).join().shardIterator();
        if (iterator == null) {
            shardIterators.remove(shardId);
        } else {
            shardIterators.put(shardId, iterator);
        }
    }

    /** Drains a shard for up to {@link StreamProcessingConstants#MAX_GET_RECORDS_ROUNDS} rounds. */
    private void drainShard(String shardId) {
        for (int round = 0; round < StreamProcessingConstants.MAX_GET_RECORDS_ROUNDS; round++) {
            String iterator = shardIterators.get(shardId);
            if (iterator == null) {
                return;
            }
            GetRecordsResponse response;
            try {
                response = streamsClient.getRecords(GetRecordsRequest.builder()
                        .shardIterator(iterator)
                        .limit(StreamProcessingConstants.GET_RECORDS_LIMIT)
                        .build()).join();
            } catch (Exception e) {
                renewIterator(shardId);
                return;
            }

            for (Record record : response.records()) {
                processRecord(shardId, record);
            }

            String nextIterator = response.nextShardIterator();
            if (nextIterator == null) {
                // Shard closed. Drop its iterator so discovery can prune it.
                shardIterators.remove(shardId);
                return;
            }
            shardIterators.put(shardId, nextIterator);
            if (response.records().isEmpty()) {
                return;
            }
        }
    }

    /** Renews an expired iterator from the last processed sequence, falling back to the initial type if trimmed. */
    private void renewIterator(String shardId) {
        String lastSequence = lastSequenceNumbers.get(shardId);
        if (lastSequence != null) {
            try {
                openIterator(shardId, ShardIteratorType.AFTER_SEQUENCE_NUMBER, lastSequence);
                logger.debug("Renewed iterator after sequence [source={}, shard={}]", sourceName, shardId);
                return;
            } catch (Exception e) {
                logger.debug("Sequence trimmed, falling back to {} [source={}, shard={}]",
                        initialIteratorType, sourceName, shardId);
            }
        }
        try {
            openIterator(shardId, initialIteratorType, null);
        } catch (Exception e) {
            shardIterators.remove(shardId);
        }
    }

    /**
     * Filters and processes one record. Non-matching records are skipped silently. A matching record is
     * retried up to the poison-pill budget, then skipped. The shard checkpoint advances only after a
     * successful projection or a poison-pill skip.
     */
    private void processRecord(String shardId, Record record) {
        if (record.eventName() != OperationType.INSERT || record.dynamodb() == null) {
            return;
        }
        Map<String, AttributeValue> newImage = record.dynamodb().newImage();
        String sequenceNumber = record.dynamodb().sequenceNumber();
        if (newImage == null || !matchesFilter(newImage)) {
            return;
        }

        int attempts = retryCounts.getOrDefault(sequenceNumber, 0);
        while (attempts < StreamProcessingConstants.MAX_PROCESS_RETRIES) {
            try {
                handler.apply(newImage).join();
                retryCounts.remove(sequenceNumber);
                lastSequenceNumbers.put(shardId, sequenceNumber);
                return;
            } catch (Exception e) {
                attempts++;
                retryCounts.put(sequenceNumber, attempts);
                if (attempts >= StreamProcessingConstants.MAX_PROCESS_RETRIES) {
                    logger.warn("Skipping poison-pill stream record after {} attempts [source={}, sequence={}, reason={}]",
                            attempts, sourceName, sequenceNumber, e.getMessage());
                    retryCounts.remove(sequenceNumber);
                    lastSequenceNumbers.put(shardId, sequenceNumber);
                    return;
                }
                logger.debug("Retrying stream record [source={}, sequence={}, attempt={}]",
                        sourceName, sequenceNumber, attempts);
            }
        }
        // Already exhausted on a prior pass (replay). Skip without blocking the shard.
        lastSequenceNumbers.put(shardId, sequenceNumber);
    }

    /** Reports whether a new image carries the entity shape this poller keeps. */
    private boolean matchesFilter(Map<String, AttributeValue> newImage) {
        AttributeValue entityType = newImage.get(ENTITY_TYPE_ATTRIBUTE);
        return entityType != null && entityTypeFilter.equals(entityType.s());
    }
}
