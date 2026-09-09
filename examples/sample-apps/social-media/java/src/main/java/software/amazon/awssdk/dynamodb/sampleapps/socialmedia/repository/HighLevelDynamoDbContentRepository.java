package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository;

import java.util.concurrent.CompletableFuture;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Repository;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.Like;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.PostMeta;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.UserPost;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbAsyncTable;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbEnhancedAsyncClient;
import software.amazon.awssdk.enhanced.dynamodb.Key;
import software.amazon.awssdk.enhanced.dynamodb.TableSchema;
import software.amazon.awssdk.services.dynamodb.DynamoDbAsyncClient;

/**
 * High-level {@link ContentRepository} using {@link DynamoDbEnhancedAsyncClient}. The at-most-once
 * like transaction drops to the underlying low-level client to express an atomic {@code ADD} counter
 * increment, which the bean-oriented enhanced update API does not model directly. Selected when
 * {@code dynamodb.client-type=high-level}.
 */
@Repository
@ConditionalOnProperty(name = "dynamodb.client-type", havingValue = "high-level")
public class HighLevelDynamoDbContentRepository implements ContentRepository {

    private static final Logger logger = LoggerFactory.getLogger(HighLevelDynamoDbContentRepository.class);

    private final DynamoDbAsyncClient lowLevelClient;
    private final DynamoDbAsyncTable<PostMeta> postMetaTable;
    private final DynamoDbAsyncTable<Like> likeTable;
    private final String tableName;

    /**
     * @param enhancedClient enhanced async client
     * @param tableName      configured Content table name
     */
    public HighLevelDynamoDbContentRepository(
            DynamoDbEnhancedAsyncClient enhancedClient,
            @Value("${dynamodb.table-name.content}") String tableName) {
        this.lowLevelClient = enhancedClient.dynamoDbAsyncClient();
        this.tableName = tableName;
        this.postMetaTable = enhancedClient.table(tableName, TableSchema.fromBean(PostMeta.class));
        this.likeTable = enhancedClient.table(tableName, TableSchema.fromBean(Like.class));
        logger.info("Initialized high-level Content repository [tableName={}]", tableName);
    }

    /** {@inheritDoc} */
    @Override
    public CompletableFuture<Void> putPost(PostMeta meta, UserPost userPost) {
        return lowLevelClient.transactWriteItems(ContentPostTransaction.build(tableName, meta, userPost))
                .thenApply(ignored -> null);
    }

    /** {@inheritDoc} */
    @Override
    public CompletableFuture<PostMeta> getPostMeta(String postId) {
        Key key = Key.builder()
                .partitionValue(PostMeta.partitionKey(postId))
                .sortValue(PostMeta.SORT_KEY)
                .build();
        return postMetaTable.getItem(r -> r.key(key).consistentRead(true));
    }

    /** {@inheritDoc} */
    @Override
    public CompletableFuture<Like> getLike(String postId, String userId) {
        Key key = Key.builder()
                .partitionValue(Like.PK_PREFIX + postId)
                .sortValue(Like.sortKey(userId))
                .build();
        return likeTable.getItem(r -> r.key(key).consistentRead(true));
    }

    /** {@inheritDoc} */
    @Override
    public CompletableFuture<Void> likeTransaction(Like like) {
        return lowLevelClient.transactWriteItems(
                ContentLikeTransaction.build(tableName, like)).thenApply(r -> null);
    }
}
