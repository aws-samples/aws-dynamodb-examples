package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository;

import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.PostMeta;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.UserPost;
import software.amazon.awssdk.enhanced.dynamodb.TableSchema;
import software.amazon.awssdk.services.dynamodb.model.Put;
import software.amazon.awssdk.services.dynamodb.model.TransactWriteItem;
import software.amazon.awssdk.services.dynamodb.model.TransactWriteItemsRequest;

/**
 * Builds the atomic source-persistence transaction for a post or expiring content.
 *
 * <p>The transaction writes the source {@code POST_META} and its author {@code USER_POST} projection
 * together. Conditional puts ensure a generated post identity cannot overwrite either row.
 */
public final class ContentPostTransaction {

    private static final TableSchema<PostMeta> POST_META_SCHEMA = TableSchema.fromBean(PostMeta.class);
    private static final TableSchema<UserPost> USER_POST_SCHEMA = TableSchema.fromBean(UserPost.class);

    /** Utility class, not instantiated. */
    private ContentPostTransaction() {
    }

    /**
     * Builds a transaction that creates both required source rows exactly once.
     *
     * @param tableName Content table name
     * @param meta source-of-truth post metadata
     * @param userPost author projection of the same post
     * @return atomic two-row transaction request
     */
    public static TransactWriteItemsRequest build(String tableName, PostMeta meta, UserPost userPost) {
        TransactWriteItem putMeta = TransactWriteItem.builder()
                .put(Put.builder()
                        .tableName(tableName)
                        .item(POST_META_SCHEMA.itemToMap(meta, true))
                        .conditionExpression("attribute_not_exists(PK)")
                        .build())
                .build();
        TransactWriteItem putUserPost = TransactWriteItem.builder()
                .put(Put.builder()
                        .tableName(tableName)
                        .item(USER_POST_SCHEMA.itemToMap(userPost, true))
                        .conditionExpression("attribute_not_exists(PK)")
                        .build())
                .build();
        return TransactWriteItemsRequest.builder().transactItems(putMeta, putUserPost).build();
    }
}
