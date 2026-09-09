package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository;

import java.util.Map;

import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.Like;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.PostMeta;
import software.amazon.awssdk.enhanced.dynamodb.TableSchema;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;
import software.amazon.awssdk.services.dynamodb.model.Put;
import software.amazon.awssdk.services.dynamodb.model.TransactWriteItem;
import software.amazon.awssdk.services.dynamodb.model.TransactWriteItemsRequest;
import software.amazon.awssdk.services.dynamodb.model.Update;

/**
 * Builds the at-most-once like {@code TransactWriteItems} request, shared by both
 * {@link ContentRepository} implementations so the observable write shape is identical.
 *
 * <p>The transaction contains a conditional {@code Put} of the {@code LIKE#} edge
 * ({@code attribute_not_exists(SK)}) and an {@code Update} on the {@code POST_META} row with
 * {@code ADD likeCount :one} guarded by {@code attribute_exists(PK)}. A conditional failure cancels
 * the whole transaction so the counter never increments without the edge, mapping to
 * {@code ALREADY_LIKED} (duplicate) or {@code POST_NOT_FOUND} (missing post).
 */
final class ContentLikeTransaction {

    private static final TableSchema<Like> LIKE_SCHEMA = TableSchema.fromBean(Like.class);

    /** Utility class, not instantiated. */
    private ContentLikeTransaction() {
    }

    /**
     * Builds the like transaction request against the given Content table.
     *
     * @param tableName Content table name
     * @param like      the like edge to write
     * @return the transactional write request
     */
    static TransactWriteItemsRequest build(String tableName, Like like) {
        TransactWriteItem putLike = TransactWriteItem.builder()
                .put(Put.builder()
                        .tableName(tableName)
                        .item(LIKE_SCHEMA.itemToMap(like, true))
                        .conditionExpression("attribute_not_exists(SK)")
                        .build())
                .build();
        TransactWriteItem incrementCounter = TransactWriteItem.builder()
                .update(Update.builder()
                        .tableName(tableName)
                        .key(RepositoryKeys.pkSk(PostMeta.partitionKey(like.getPostId()), PostMeta.SORT_KEY))
                        .updateExpression("ADD likeCount :one")
                        .conditionExpression("attribute_exists(PK)")
                        .expressionAttributeValues(Map.of(":one", AttributeValue.fromN("1")))
                        .build())
                .build();
        return TransactWriteItemsRequest.builder()
                .transactItems(putLike, incrementCounter)
                .build();
    }
}
