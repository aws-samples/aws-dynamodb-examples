package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository;

import java.util.concurrent.CompletableFuture;

import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.Like;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.PostMeta;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.UserPost;

/**
 * Persistence boundary for the Content table: post metadata, user-post projections, and likes.
 *
 * <p>Two implementations are selected at startup by {@code dynamodb.client-type}. Both keep DynamoDB
 * I/O async end-to-end and persist an identical item shape.
 */
public interface ContentRepository {

    /**
     * Persists the two source-of-truth post rows: the {@code POST_META} row and the author's
     * {@code USER_POST} projection (publish steps 1 and 2, for expiring items) in one
     * {@code TransactWriteItems} operation. Neither source row becomes visible if the other cannot be
     * created.
     *
     * @param meta     the {@code POST_META} row
     * @param userPost the author-profile {@code USER_POST} projection of the same post
     * @return future completing when both rows are written
     */
    CompletableFuture<Void> putPost(PostMeta meta, UserPost userPost);

    CompletableFuture<PostMeta> getPostMeta(String postId);

    CompletableFuture<Like> getLike(String postId, String userId);

    /**
     * Records an at-most-once like in one {@code TransactWriteItems}: a conditional {@code PutItem} of
     * the {@code LIKE#} edge ({@code attribute_not_exists(SK)}) plus {@code ADD likeCount :one} on the
     * {@code POST_META} row guarded by {@code attribute_exists(PK)}.
     *
     * <p>The future completes exceptionally with a {@code TransactionCanceledException} cause on a
     * duplicate like (maps to {@code ALREADY_LIKED}) or a missing post ({@code POST_NOT_FOUND}).
     *
     * @param like the like edge to write
     * @return future completing when the transaction commits
     */
    CompletableFuture<Void> likeTransaction(Like like);
}
