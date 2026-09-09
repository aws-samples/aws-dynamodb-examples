package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.unit.stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Consumer;
import java.util.function.Function;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.PostMeta;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.stream.StreamProcessingConstants;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.stream.StreamSourcePoller;
import software.amazon.awssdk.services.dynamodb.DynamoDbAsyncClient;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;
import software.amazon.awssdk.services.dynamodb.model.DescribeStreamRequest;
import software.amazon.awssdk.services.dynamodb.model.DescribeStreamResponse;
import software.amazon.awssdk.services.dynamodb.model.DescribeTableResponse;
import software.amazon.awssdk.services.dynamodb.model.GetRecordsRequest;
import software.amazon.awssdk.services.dynamodb.model.GetRecordsResponse;
import software.amazon.awssdk.services.dynamodb.model.GetShardIteratorRequest;
import software.amazon.awssdk.services.dynamodb.model.GetShardIteratorResponse;
import software.amazon.awssdk.services.dynamodb.model.OperationType;
import software.amazon.awssdk.services.dynamodb.model.Record;
import software.amazon.awssdk.services.dynamodb.model.Shard;
import software.amazon.awssdk.services.dynamodb.model.ShardIteratorType;
import software.amazon.awssdk.services.dynamodb.model.StreamDescription;
import software.amazon.awssdk.services.dynamodb.model.StreamRecord;
import software.amazon.awssdk.services.dynamodb.model.TableDescription;
import software.amazon.awssdk.services.dynamodb.streams.DynamoDbStreamsAsyncClient;

/**
 * Unit coverage for in-process stream poller retry, checkpoint, poison-pill skip, and iterator
 * renewal. No Docker is required. The DynamoDB and Streams async clients are mocked so one
 * {@code pollOnce} tick can be asserted directly.
 */
@Tag("unit")
@ExtendWith(MockitoExtension.class)
class StreamSourcePollerTest {

    private static final String TABLE = "JavaContent";
    private static final String STREAM_ARN = "arn:stream";
    private static final String SHARD_ID = "shard-1";
    private static final String SEQUENCE = "seq-1";
    private static final String FIRST_ITERATOR = "iter-1";
    private static final String NEXT_ITERATOR = "iter-2";

    @Mock
    private DynamoDbAsyncClient dynamoDbAsyncClient;

    @Mock
    private DynamoDbStreamsAsyncClient streamsClient;

    @Test
    void pollOnce_whenHandlerSucceedsThenIteratorExpires_renewsAfterSequenceNumber() {
        AtomicInteger invocations = new AtomicInteger();
        stubDiscovery();
        stubGetRecordsThenExpire(insertRecord(PostMeta.ENTITY_TYPE));
        stubIteratorRenewal(false);

        poller(newImage -> {
            invocations.incrementAndGet();
            return CompletableFuture.completedFuture(null);
        }).pollOnce();

        assertThat(invocations.get()).isEqualTo(1);
        GetShardIteratorRequest renewal = lastIteratorRequest();
        assertThat(renewal.shardIteratorType()).isEqualTo(ShardIteratorType.AFTER_SEQUENCE_NUMBER);
        assertThat(renewal.sequenceNumber()).isEqualTo(SEQUENCE);
    }

    @Test
    void pollOnce_whenHandlerFailsTwiceThenSucceeds_retriesThenAdvancesCheckpoint() {
        AtomicInteger invocations = new AtomicInteger();
        stubDiscovery();
        stubGetRecordsThenExpire(insertRecord(PostMeta.ENTITY_TYPE));
        stubIteratorRenewal(false);

        poller(newImage -> {
            int attempt = invocations.incrementAndGet();
            if (attempt < StreamProcessingConstants.MAX_PROCESS_RETRIES) {
                return CompletableFuture.failedFuture(new IllegalStateException("transient"));
            }
            return CompletableFuture.completedFuture(null);
        }).pollOnce();

        assertThat(invocations.get()).isEqualTo(StreamProcessingConstants.MAX_PROCESS_RETRIES);
        GetShardIteratorRequest renewal = lastIteratorRequest();
        assertThat(renewal.shardIteratorType()).isEqualTo(ShardIteratorType.AFTER_SEQUENCE_NUMBER);
        assertThat(renewal.sequenceNumber()).isEqualTo(SEQUENCE);
    }

    @Test
    void pollOnce_whenHandlerFailsUntilMaxRetries_skipsPoisonPillAndAdvancesCheckpoint() {
        AtomicInteger invocations = new AtomicInteger();
        stubDiscovery();
        stubGetRecordsThenExpire(insertRecord(PostMeta.ENTITY_TYPE));
        stubIteratorRenewal(false);

        poller(newImage -> {
            invocations.incrementAndGet();
            return CompletableFuture.failedFuture(new IllegalStateException("poison"));
        }).pollOnce();

        assertThat(invocations.get()).isEqualTo(StreamProcessingConstants.MAX_PROCESS_RETRIES);
        GetShardIteratorRequest renewal = lastIteratorRequest();
        assertThat(renewal.shardIteratorType()).isEqualTo(ShardIteratorType.AFTER_SEQUENCE_NUMBER);
        assertThat(renewal.sequenceNumber()).isEqualTo(SEQUENCE);
    }

    @Test
    void pollOnce_whenRecordDoesNotMatchFilter_doesNotAdvanceCheckpoint() {
        AtomicInteger invocations = new AtomicInteger();
        stubDiscovery();
        stubGetRecordsThenExpire(insertRecord("LIKE"));
        stubIteratorRenewal(false);

        poller(newImage -> {
            invocations.incrementAndGet();
            return CompletableFuture.completedFuture(null);
        }).pollOnce();

        assertThat(invocations.get()).isZero();
        GetShardIteratorRequest renewal = lastIteratorRequest();
        assertThat(renewal.shardIteratorType()).isEqualTo(ShardIteratorType.LATEST);
        assertThat(renewal.sequenceNumber()).isNull();
    }

    @Test
    void pollOnce_whenGetRecordsFailsBeforeAnyRecord_renewsWithLatest() {
        stubDiscovery();
        when(streamsClient.getRecords(any(GetRecordsRequest.class)))
                .thenReturn(CompletableFuture.failedFuture(new IllegalStateException("expired")));
        stubIteratorRenewal(false);

        poller(newImage -> CompletableFuture.completedFuture(null)).pollOnce();

        GetShardIteratorRequest renewal = lastIteratorRequest();
        assertThat(renewal.shardIteratorType()).isEqualTo(ShardIteratorType.LATEST);
        assertThat(renewal.sequenceNumber()).isNull();
    }

    @Test
    void pollOnce_whenAfterSequenceNumberFails_fallsBackToInitialIteratorType() {
        stubDiscovery();
        stubGetRecordsThenExpire(insertRecord(PostMeta.ENTITY_TYPE));
        stubIteratorRenewal(true);

        poller(newImage -> CompletableFuture.completedFuture(null)).pollOnce();

        List<GetShardIteratorRequest> requests = iteratorRequests();
        assertThat(requests).hasSize(3);
        assertThat(requests.get(0).shardIteratorType()).isEqualTo(ShardIteratorType.LATEST);
        assertThat(requests.get(1).shardIteratorType()).isEqualTo(ShardIteratorType.AFTER_SEQUENCE_NUMBER);
        assertThat(requests.get(1).sequenceNumber()).isEqualTo(SEQUENCE);
        assertThat(requests.get(2).shardIteratorType()).isEqualTo(ShardIteratorType.LATEST);
        assertThat(requests.get(2).sequenceNumber()).isNull();
    }

    /**
     * Builds a poller that projects Content {@code POST_META} inserts.
     *
     * @param handler projection invoked with each matching new image
     * @return poller under test
     */
    private StreamSourcePoller poller(Function<Map<String, AttributeValue>, CompletableFuture<Void>> handler) {
        return new StreamSourcePoller("Content", TABLE, PostMeta.ENTITY_TYPE, handler,
                ShardIteratorType.LATEST, dynamoDbAsyncClient, streamsClient);
    }

    /**
     * Stubs stream ARN resolution, one live shard, and the initial {@code LATEST} iterator.
     */
    private void stubDiscovery() {
        when(dynamoDbAsyncClient.describeTable(any(Consumer.class))).thenReturn(
                CompletableFuture.completedFuture(DescribeTableResponse.builder()
                        .table(TableDescription.builder().latestStreamArn(STREAM_ARN).build())
                        .build()));
        when(streamsClient.describeStream(any(DescribeStreamRequest.class))).thenReturn(
                CompletableFuture.completedFuture(DescribeStreamResponse.builder()
                        .streamDescription(StreamDescription.builder()
                                .shards(Shard.builder().shardId(SHARD_ID).build())
                                .build())
                        .build()));
    }

    /**
     * Stubs one matching page, then an expired iterator on the next {@code GetRecords} call.
     *
     * @param record first-page stream record
     */
    private void stubGetRecordsThenExpire(Record record) {
        when(streamsClient.getRecords(any(GetRecordsRequest.class)))
                .thenReturn(CompletableFuture.completedFuture(GetRecordsResponse.builder()
                        .records(record)
                        .nextShardIterator(NEXT_ITERATOR)
                        .build()))
                .thenReturn(CompletableFuture.failedFuture(new IllegalStateException("expired")));
    }

    /**
     * Continues {@code getShardIterator} stubbing after discovery. The first call is already the
     * discovery {@code LATEST} iterator from {@link #stubDiscovery()}.
     *
     * @param failAfterSequence when true, {@code AFTER_SEQUENCE_NUMBER} fails and {@code LATEST} is
     *                          used as the fallback
     */
    private void stubIteratorRenewal(boolean failAfterSequence) {
        GetShardIteratorResponse ok = GetShardIteratorResponse.builder()
                .shardIterator(FIRST_ITERATOR).build();
        if (failAfterSequence) {
            when(streamsClient.getShardIterator(any(GetShardIteratorRequest.class)))
                    .thenReturn(CompletableFuture.completedFuture(ok))
                    .thenReturn(CompletableFuture.failedFuture(new IllegalStateException("trimmed")))
                    .thenReturn(CompletableFuture.completedFuture(ok));
            return;
        }
        when(streamsClient.getShardIterator(any(GetShardIteratorRequest.class)))
                .thenReturn(CompletableFuture.completedFuture(ok));
    }

    /**
     * @return every shard-iterator request issued in the tick
     */
    private List<GetShardIteratorRequest> iteratorRequests() {
        ArgumentCaptor<GetShardIteratorRequest> captor = ArgumentCaptor.forClass(GetShardIteratorRequest.class);
        verify(streamsClient, atLeastOnce()).getShardIterator(captor.capture());
        return new ArrayList<>(captor.getAllValues());
    }

    /**
     * @return the last shard-iterator request, which is the renewal after {@code GetRecords} fails
     */
    private GetShardIteratorRequest lastIteratorRequest() {
        List<GetShardIteratorRequest> requests = iteratorRequests();
        return requests.get(requests.size() - 1);
    }

    /**
     * Builds an {@code INSERT} record with the supplied entity type.
     *
     * @param entityType new-image {@code entityType}
     * @return stream record
     */
    private static Record insertRecord(String entityType) {
        return Record.builder()
                .eventName(OperationType.INSERT)
                .dynamodb(StreamRecord.builder()
                        .sequenceNumber(SEQUENCE)
                        .newImage(Map.of("entityType", AttributeValue.fromS(entityType)))
                        .build())
                .build();
    }
}
