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
import software.amazon.awssdk.enhanced.dynamodb.TableSchema;
import software.amazon.awssdk.services.dynamodb.DynamoDbAsyncClient;
import software.amazon.awssdk.services.dynamodb.model.GetItemRequest;

/**
 * Low-level {@link ContentRepository} using {@link DynamoDbAsyncClient} with attribute maps.
 * Selected when {@code dynamodb.client-type=low-level}. The like transaction is built by
 * {@link ContentLikeTransaction}, shared with the high-level implementation.
 */
@Repository
@ConditionalOnProperty(name = "dynamodb.client-type", havingValue = "low-level")
public class LowLevelDynamoDbContentRepository implements ContentRepository {

    private static final Logger logger = LoggerFactory.getLogger(LowLevelDynamoDbContentRepository.class);

    private static final TableSchema<PostMeta> POST_META_SCHEMA = TableSchema.fromBean(PostMeta.class);
    private static final TableSchema<Like> LIKE_SCHEMA = TableSchema.fromBean(Like.class);

    private final DynamoDbAsyncClient client;
    private final String tableName;

    /**
     * @param client    low-level async client
     * @param tableName configured Content table name
     */
    public LowLevelDynamoDbContentRepository(
            DynamoDbAsyncClient client,
            @Value("${dynamodb.table-name.content}") String tableName) {
        this.client = client;
        this.tableName = tableName;
        logger.info("Initialized low-level Content repository [tableName={}]", tableName);
    }

    /** {@inheritDoc} */
    @Override
    public CompletableFuture<Void> putPost(PostMeta meta, UserPost userPost) {
        return client.transactWriteItems(ContentPostTransaction.build(tableName, meta, userPost))
                .thenApply(ignored -> null);
    }

    /** {@inheritDoc} */
    @Override
    public CompletableFuture<PostMeta> getPostMeta(String postId) {
        GetItemRequest request = GetItemRequest.builder()
                .tableName(tableName)
                .key(RepositoryKeys.pkSk(PostMeta.partitionKey(postId), PostMeta.SORT_KEY))
                .consistentRead(true)
                .build();
        return client.getItem(request)
                .thenApply(response -> response.hasItem() ? POST_META_SCHEMA.mapToItem(response.item()) : null);
    }

    /** {@inheritDoc} */
    @Override
    public CompletableFuture<Like> getLike(String postId, String userId) {
        GetItemRequest request = GetItemRequest.builder()
                .tableName(tableName)
                .key(RepositoryKeys.pkSk(Like.PK_PREFIX + postId, Like.sortKey(userId)))
                .consistentRead(true)
                .build();
        return client.getItem(request)
                .thenApply(response -> response.hasItem() ? LIKE_SCHEMA.mapToItem(response.item()) : null);
    }

    /** {@inheritDoc} */
    @Override
    public CompletableFuture<Void> likeTransaction(Like like) {
        return client.transactWriteItems(ContentLikeTransaction.build(tableName, like)).thenApply(r -> null);
    }
}
