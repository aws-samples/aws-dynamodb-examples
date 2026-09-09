package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.exception;

/**
 * Raised when a post is absent, or the caller is not permitted to see it under the post visibility
 * rules.
 *
 * <p>Maps to HTTP {@code 404} with error code {@code POST_NOT_FOUND}. A visibility-denied caller
 * receives the same not-found result as a missing post so post existence is not leaked.
 */
public class PostNotFoundException extends RuntimeException {

private final String postId;

    /**
     * Creates the exception for a missing or visibility-hidden post.
     *
     * @param postId the post id that is absent or not permitted
     */
    public PostNotFoundException(String postId) {
        super("Post not found: postId=" + postId);
        this.postId = postId;
    }

    public String getPostId() {
        return postId;
    }
}
