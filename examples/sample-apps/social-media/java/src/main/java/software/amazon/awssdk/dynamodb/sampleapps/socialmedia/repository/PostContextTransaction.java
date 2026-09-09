package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository;

import java.util.List;

import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.FollowingEdge;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.Like;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.PostMeta;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.UserProfile;
import software.amazon.awssdk.enhanced.dynamodb.TableSchema;
import software.amazon.awssdk.services.dynamodb.model.Get;
import software.amazon.awssdk.services.dynamodb.model.ItemResponse;
import software.amazon.awssdk.services.dynamodb.model.TransactGetItem;
import software.amazon.awssdk.services.dynamodb.model.TransactGetItemsRequest;
import software.amazon.awssdk.services.dynamodb.model.TransactGetItemsResponse;

/**
 * Builds and maps the atomic post-context read across the Content and UserGraph tables.
 *
 * <p>The transaction returns the post metadata, viewer profile, viewer like, author profile, and
 * viewer following edge from one DynamoDB snapshot. The initial metadata lookup in the service only
 * discovers the immutable author key needed to build this request.
 */
public final class PostContextTransaction {

    private static final TableSchema<PostMeta> POST_META_SCHEMA = TableSchema.fromBean(PostMeta.class);
    private static final TableSchema<UserProfile> PROFILE_SCHEMA = TableSchema.fromBean(UserProfile.class);
    private static final TableSchema<Like> LIKE_SCHEMA = TableSchema.fromBean(Like.class);
    private static final TableSchema<FollowingEdge> FOLLOWING_SCHEMA = TableSchema.fromBean(FollowingEdge.class);

    /** Utility class, not instantiated. */
    private PostContextTransaction() {
    }

    /**
     * Builds the five-item transaction used to decide authorization and assemble post context.
     *
     * @param contentTable Content table name
     * @param userGraphTable UserGraph table name
     * @param postId post whose context is read
     * @param viewerId authenticated viewer
     * @param authorId immutable post author discovered before this transaction
     * @return atomic transaction request
     */
    public static TransactGetItemsRequest build(String contentTable, String userGraphTable, String postId,
                                                String viewerId, String authorId) {
        if (viewerId.equals(authorId)) {
            return TransactGetItemsRequest.builder().transactItems(List.of(
                    get(contentTable, PostMeta.partitionKey(postId), PostMeta.SORT_KEY),
                    get(userGraphTable, UserProfile.partitionKey(viewerId), UserProfile.SORT_KEY),
                    get(contentTable, Like.PK_PREFIX + postId, Like.sortKey(viewerId)),
                    get(userGraphTable, FollowingEdge.PK_PREFIX + viewerId, FollowingEdge.sortKey(authorId))))
                    .build();
        }
        return TransactGetItemsRequest.builder().transactItems(List.of(
                get(contentTable, PostMeta.partitionKey(postId), PostMeta.SORT_KEY),
                get(userGraphTable, UserProfile.partitionKey(viewerId), UserProfile.SORT_KEY),
                get(contentTable, Like.PK_PREFIX + postId, Like.sortKey(viewerId)),
                get(userGraphTable, UserProfile.partitionKey(authorId), UserProfile.SORT_KEY),
                get(userGraphTable, FollowingEdge.PK_PREFIX + viewerId, FollowingEdge.sortKey(authorId))))
                .build();
    }

    /**
     * Maps the ordered transaction response into the post-context item set.
     *
     * @param response completed transaction response
     * @param viewerId authenticated viewer
     * @param authorId immutable post author discovered before this transaction
     * @return mapped rows, with optional edges represented as {@code null}
     */
    public static PostContextItems toItems(TransactGetItemsResponse response, String viewerId, String authorId) {
        List<ItemResponse> responses = response.responses();
        if (viewerId.equals(authorId)) {
            UserProfile profile = item(responses, 1, PROFILE_SCHEMA);
            return new PostContextItems(
                    item(responses, 0, POST_META_SCHEMA),
                    profile,
                    item(responses, 2, LIKE_SCHEMA),
                    profile,
                    item(responses, 3, FOLLOWING_SCHEMA));
        }
        return new PostContextItems(
                item(responses, 0, POST_META_SCHEMA),
                item(responses, 1, PROFILE_SCHEMA),
                item(responses, 2, LIKE_SCHEMA),
                item(responses, 3, PROFILE_SCHEMA),
                item(responses, 4, FOLLOWING_SCHEMA));
    }

    /** Builds one transaction get for a table primary key. */
    private static TransactGetItem get(String tableName, String partitionKey, String sortKey) {
        return TransactGetItem.builder().get(Get.builder().tableName(tableName)
                .key(RepositoryKeys.pkSk(partitionKey, sortKey)).build()).build();
    }

    /** Maps an optional ordered response item through the supplied table schema. */
    private static <T> T item(List<ItemResponse> responses,
                              int index, TableSchema<T> schema) {
        if (responses.size() <= index || !responses.get(index).hasItem()) {
            return null;
        }
        return schema.mapToItem(responses.get(index).item());
    }
}
