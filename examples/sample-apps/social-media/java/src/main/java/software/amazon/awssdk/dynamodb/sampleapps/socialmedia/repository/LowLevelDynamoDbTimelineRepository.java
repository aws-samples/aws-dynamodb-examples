package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository;

import java.util.List;
import java.util.concurrent.CompletableFuture;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Repository;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.TimelineEntry;
import software.amazon.awssdk.services.dynamodb.DynamoDbAsyncClient;

/**
 * Low-level {@link TimelineRepository} using {@link DynamoDbAsyncClient} with attribute maps and the
 * shared {@link TimelineOperations}. Selected when {@code dynamodb.client-type=low-level}.
 */
@Repository
@ConditionalOnProperty(name = "dynamodb.client-type", havingValue = "low-level")
public class LowLevelDynamoDbTimelineRepository implements TimelineRepository {

    private static final Logger logger = LoggerFactory.getLogger(LowLevelDynamoDbTimelineRepository.class);

    private final DynamoDbAsyncClient client;
    private final String tableName;

    /**
     * @param client    low-level async client
     * @param tableName configured Timelines table name
     */
    public LowLevelDynamoDbTimelineRepository(
            DynamoDbAsyncClient client,
            @Value("${dynamodb.table-name.timelines}") String tableName) {
        this.client = client;
        this.tableName = tableName;
        logger.info("Initialized low-level Timeline repository [tableName={}]", tableName);
    }

    /** {@inheritDoc} */
    @Override
    public CompletableFuture<Void> fanOut(List<TimelineEntry> entries, int chunkSize) {
        return TimelineOperations.fanOut(client, tableName, entries, chunkSize, logger);
    }

    /** {@inheritDoc} */
    @Override
    public CompletableFuture<TimelinePage> queryTimeline(String userId,
                                                         int limit,
                                                         boolean scanIndexForward,
                                                         String nextToken) {
        return TimelineOperations.queryTimeline(client, tableName, userId, limit, scanIndexForward, nextToken);
    }
}
