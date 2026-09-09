package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository;

import java.util.concurrent.CompletableFuture;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Repository;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbEnhancedAsyncClient;
import software.amazon.awssdk.services.dynamodb.DynamoDbAsyncClient;

/**
 * High-level {@link PostContextRepository}. The post-context read is a multi-table
 * {@code TransactGetItems} snapshot that returns more than one entity type per table, which the
 * bean-oriented enhanced API does not model directly, so it drops to the underlying low-level client
 * and maps rows through the shared {@link PostContextTransaction}. Selected when
 * {@code dynamodb.client-type=high-level}.
 */
@Repository
@ConditionalOnProperty(name = "dynamodb.client-type", havingValue = "high-level")
public class HighLevelDynamoDbPostContextRepository implements PostContextRepository {

    private static final Logger logger = LoggerFactory.getLogger(HighLevelDynamoDbPostContextRepository.class);

    private final DynamoDbAsyncClient lowLevelClient;
    private final String contentTable;
    private final String userGraphTable;

    /**
     * @param enhancedClient    enhanced async client, source of the underlying low-level client
     * @param contentTableName  configured Content table name
     * @param userGraphTableName configured UserGraph table name
     */
    public HighLevelDynamoDbPostContextRepository(
            DynamoDbEnhancedAsyncClient enhancedClient,
            @Value("${dynamodb.table-name.content}") String contentTableName,
            @Value("${dynamodb.table-name.user-graph}") String userGraphTableName) {
        this.lowLevelClient = enhancedClient.dynamoDbAsyncClient();
        this.contentTable = contentTableName;
        this.userGraphTable = userGraphTableName;
        logger.info("Initialized high-level PostContext repository [contentTable={}, userGraphTable={}]",
                contentTableName, userGraphTableName);
    }

    /** {@inheritDoc} */
    @Override
    public CompletableFuture<PostContextItems> loadPostContext(String postId, String viewerId, String authorId) {
        return lowLevelClient.transactGetItems(PostContextTransaction.build(contentTable, userGraphTable,
                postId, viewerId, authorId)).thenApply(response ->
                PostContextTransaction.toItems(response, viewerId, authorId));
    }
}
