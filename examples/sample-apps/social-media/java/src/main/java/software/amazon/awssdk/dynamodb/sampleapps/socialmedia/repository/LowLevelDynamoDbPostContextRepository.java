package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository;

import java.util.concurrent.CompletableFuture;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Repository;
import software.amazon.awssdk.services.dynamodb.DynamoDbAsyncClient;

/**
 * Low-level {@link PostContextRepository} using {@link DynamoDbAsyncClient} with attribute maps. The
 * post-context read is a multi-table {@code TransactGetItems} snapshot mapped through the shared
 * {@link PostContextTransaction}. Selected when {@code dynamodb.client-type=low-level}.
 */
@Repository
@ConditionalOnProperty(name = "dynamodb.client-type", havingValue = "low-level")
public class LowLevelDynamoDbPostContextRepository implements PostContextRepository {

    private static final Logger logger = LoggerFactory.getLogger(LowLevelDynamoDbPostContextRepository.class);

    private final DynamoDbAsyncClient client;
    private final String contentTable;
    private final String userGraphTable;

    /**
     * @param client             low-level async client
     * @param contentTableName   configured Content table name
     * @param userGraphTableName configured UserGraph table name
     */
    public LowLevelDynamoDbPostContextRepository(
            DynamoDbAsyncClient client,
            @Value("${dynamodb.table-name.content}") String contentTableName,
            @Value("${dynamodb.table-name.user-graph}") String userGraphTableName) {
        this.client = client;
        this.contentTable = contentTableName;
        this.userGraphTable = userGraphTableName;
        logger.info("Initialized low-level PostContext repository [contentTable={}, userGraphTable={}]",
                contentTableName, userGraphTableName);
    }

    /** {@inheritDoc} */
    @Override
    public CompletableFuture<PostContextItems> loadPostContext(String postId, String viewerId, String authorId) {
        return client.transactGetItems(PostContextTransaction.build(contentTable, userGraphTable,
                postId, viewerId, authorId)).thenApply(response ->
                PostContextTransaction.toItems(response, viewerId, authorId));
    }
}
