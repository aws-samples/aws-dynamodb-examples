package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository;

import java.util.concurrent.CompletableFuture;

/**
 * Persistence boundary for the post-context snapshot read.
 *
 * <p>Assembles the five items that back the response in one {@code TransactGetItems} operation across
 * the Content and UserGraph tables: the {@code POST_META} row and viewer {@code LIKE#} edge on
 * Content, plus the viewer {@code PROFILE}, author {@code PROFILE}, and viewer {@code FOLLOWING#}
 * edge on UserGraph.
 *
 * <p>Two implementations are selected at startup by {@code dynamodb.client-type}. Both keep DynamoDB
 * I/O async end-to-end and read an identical item shape.
 */
public interface PostContextRepository {

    /**
     * Loads the post-context items in one atomic {@code TransactGetItems} snapshot across Content and
     * UserGraph.
     *
     * @param postId   the post whose context is read
     * @param viewerId the {@code X-User-Id} viewer, resolving the optional like and following edges
     * @param authorId the post author, resolving the author profile and the following-edge target
     * @return future completing with the assembled items, with optional edges {@code null} when absent
     */
    CompletableFuture<PostContextItems> loadPostContext(String postId, String viewerId, String authorId);
}
