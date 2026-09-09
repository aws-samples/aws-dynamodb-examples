package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository;

import java.util.List;
import java.util.concurrent.CompletableFuture;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Repository;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.TimelineEntry;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbEnhancedAsyncClient;
import software.amazon.awssdk.services.dynamodb.DynamoDbAsyncClient;

/**
 * High-level {@link TimelineRepository}. Timeline fan-out is a chunked {@code BatchWriteItem} and the
 * read is a composite-key {@code GSI_TIMELINE} query, so it uses the low-level client obtained from
 * the enhanced client (bean mapping still flows through the shared {@link TimelineOperations}).
 * Selected when {@code dynamodb.client-type=high-level}.
 */
@Repository
@ConditionalOnProperty(name = "dynamodb.client-type", havingValue = "high-level")
public class HighLevelDynamoDbTimelineRepository implements TimelineRepository {

    private static final Logger logger = LoggerFactory.getLogger(HighLevelDynamoDbTimelineRepository.class);

    private final DynamoDbAsyncClient client;
    private final String tableName;

    /**
     * @param enhancedClient enhanced async client (supplies the underlying low-level client)
     * @param tableName      configured Timelines table name
     */
    public HighLevelDynamoDbTimelineRepository(
            DynamoDbEnhancedAsyncClient enhancedClient,
            @Value("${dynamodb.table-name.timelines}") String tableName) {
        this.client = enhancedClient.dynamoDbAsyncClient();
        this.tableName = tableName;
        logger.info("Initialized high-level Timeline repository [tableName={}]", tableName);
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
