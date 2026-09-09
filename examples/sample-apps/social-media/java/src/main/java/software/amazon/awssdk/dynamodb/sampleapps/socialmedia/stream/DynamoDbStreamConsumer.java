package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.stream;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ThreadFactory;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.Message;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.PostMeta;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.service.NotificationProjectionService;
import software.amazon.awssdk.enhanced.dynamodb.TableSchema;
import software.amazon.awssdk.services.dynamodb.DynamoDbAsyncClient;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;
import software.amazon.awssdk.services.dynamodb.model.ShardIteratorType;
import software.amazon.awssdk.services.dynamodb.streams.DynamoDbStreamsAsyncClient;

/**
 * In-process consumer that drives notification projection and ASYNC timeline fan-out from the
 * two source table streams.
 *
 * <p>This is a sample poller. Checkpoints and retry counts are process-local. A restart with
 * {@code dynamodb.streams.iterator-type=LATEST} can skip inserts produced while no consumer was
 * running. Two instances can project the same insert. Idempotent notification and timeline writes
 * absorb those duplicates. After {@link StreamProcessingConstants#MAX_PROCESS_RETRIES} failed
 * attempts a record is skipped and that insert is not projected. Use a durable consumer in
 * production, such as a Lambda event-source mapping or the Kinesis Client Library with a DynamoDB
 * checkpoint table.
 *
 * <p>The component exists only when the poller is enabled. When {@code dynamodb.streams.enabled=false}
 * this bean is not instantiated at all, so both stream sources are disabled and the application runs
 * HTTP-only. When enabled it subscribes to the <strong>Content</strong> stream (kept records:
 * {@code entityType = POST_META} on {@code INSERT}) and the <strong>Messages</strong> stream (kept
 * records: {@code entityType = MESSAGE} on {@code INSERT}). It reconstructs the domain row from each
 * new image and hands it to {@link NotificationProjectionService}.
 *
 * <p>Each source runs on its own single daemon scheduler thread. The first poll is delayed by
 * {@link StreamProcessingConstants#STARTUP_DELAY_MILLIS} to let local resources finish startup, then
 * ticks every {@link StreamProcessingConstants#POLL_INTERVAL_MILLIS}. On shutdown the schedulers stop
 * and drain in-flight work for up to {@link StreamProcessingConstants#SHUTDOWN_AWAIT_SECONDS} before
 * force-stopping.
 */
@Component
@ConditionalOnProperty(name = "dynamodb.streams.enabled", havingValue = "true", matchIfMissing = true)
public class DynamoDbStreamConsumer {

    private static final Logger logger = LoggerFactory.getLogger(DynamoDbStreamConsumer.class);

private static final TableSchema<PostMeta> POST_META_SCHEMA = TableSchema.fromBean(PostMeta.class);

private static final TableSchema<Message> MESSAGE_SCHEMA = TableSchema.fromBean(Message.class);

    private final DynamoDbStreamsAsyncClient streamsClient;
    private final DynamoDbAsyncClient dynamoDbAsyncClient;
    private final NotificationProjectionService projectionService;
    private final String contentTable;
    private final String messagesTable;
    private final ShardIteratorType initialIteratorType;

    private final List<ScheduledExecutorService> schedulers = new ArrayList<>();

    /**
     * @param streamsClient       streams client for polling
     * @param dynamoDbAsyncClient low-level client for stream-ARN resolution
     * @param projectionService   notification and ASYNC timeline projection
     * @param contentTable        Content table name
     * @param messagesTable       Messages table name
     * @param iteratorType        initial iterator type ({@code LATEST} or {@code TRIM_HORIZON})
     */
    public DynamoDbStreamConsumer(DynamoDbStreamsAsyncClient streamsClient,
                                  DynamoDbAsyncClient dynamoDbAsyncClient,
                                  NotificationProjectionService projectionService,
                                  @Value("${dynamodb.table-name.content}") String contentTable,
                                  @Value("${dynamodb.table-name.messages}") String messagesTable,
                                  @Value("${dynamodb.streams.iterator-type:LATEST}") String iteratorType) {
        this.streamsClient = streamsClient;
        this.dynamoDbAsyncClient = dynamoDbAsyncClient;
        this.projectionService = projectionService;
        this.contentTable = contentTable;
        this.messagesTable = messagesTable;
        this.initialIteratorType = ShardIteratorType.fromValue(iteratorType);
    }

    /** Starts one daemon scheduler per source once the application context is ready. */
    @PostConstruct
    void start() {
        StreamSourcePoller contentPoller = new StreamSourcePoller(
                "Content", contentTable, PostMeta.ENTITY_TYPE, this::consumePostInsert,
                initialIteratorType, dynamoDbAsyncClient, streamsClient);
        StreamSourcePoller messagesPoller = new StreamSourcePoller(
                "Messages", messagesTable, Message.ENTITY_TYPE, this::consumeMessageInsert,
                initialIteratorType, dynamoDbAsyncClient, streamsClient);

        schedule("Content", contentPoller);
        schedule("Messages", messagesPoller);
        logger.info("Started stream consumer [sources=[Content, Messages], iteratorType={}]",
                initialIteratorType);
    }

    /** Schedules a poller on a dedicated single daemon thread. */
    private void schedule(String sourceName, StreamSourcePoller poller) {
        ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor(
                daemonThreadFactory("stream-" + sourceName.toLowerCase()));
        schedulers.add(scheduler);
        scheduler.scheduleWithFixedDelay(poller::pollOnce,
                StreamProcessingConstants.STARTUP_DELAY_MILLIS,
                StreamProcessingConstants.POLL_INTERVAL_MILLIS,
                TimeUnit.MILLISECONDS);
    }

    /**
     * Reconstructs and projects one {@code POST_META} insert new image delivered by the Content
     * stream. The projection is safe to invoke repeatedly for the same image.
     *
     * @param newImage the DynamoDB Streams new image for a {@code POST_META} insert
     * @return a future completing when notification and optional timeline projections finish
     */
    public CompletableFuture<Void> consumePostInsert(Map<String, AttributeValue> newImage) {
        return projectionService.projectPost(POST_META_SCHEMA.mapToItem(newImage));
    }

    /**
     * Reconstructs and projects one {@code MESSAGE} insert new image delivered by the Messages
     * stream. The projection is safe to invoke repeatedly for the same image.
     *
     * @param newImage the DynamoDB Streams new image for a {@code MESSAGE} insert
     * @return a future completing when notification projections finish
     */
    public CompletableFuture<Void> consumeMessageInsert(Map<String, AttributeValue> newImage) {
        return projectionService.projectMessage(MESSAGE_SCHEMA.mapToItem(newImage));
    }

    /** Stops both schedulers, awaiting in-flight work before force-stopping. */
    @PreDestroy
    void stop() {
        for (ScheduledExecutorService scheduler : schedulers) {
            scheduler.shutdown();
        }
        for (ScheduledExecutorService scheduler : schedulers) {
            try {
                if (!scheduler.awaitTermination(StreamProcessingConstants.SHUTDOWN_AWAIT_SECONDS, TimeUnit.SECONDS)) {
                    scheduler.shutdownNow();
                }
            } catch (InterruptedException e) {
                scheduler.shutdownNow();
                Thread.currentThread().interrupt();
            }
        }
        logger.info("Stopped stream consumer");
    }

    /** Builds a daemon thread factory so pollers never block JVM shutdown. */
    private ThreadFactory daemonThreadFactory(String namePrefix) {
        AtomicInteger counter = new AtomicInteger();
        return runnable -> {
            Thread thread = new Thread(runnable, namePrefix + "-" + counter.incrementAndGet());
            thread.setDaemon(true);
            return thread;
        };
    }
}
