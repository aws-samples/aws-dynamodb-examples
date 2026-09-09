package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.exception;

/**
 * Raised when the caller has already liked the post.
 *
 * <p>Maps to HTTP {@code 409} with error code {@code ALREADY_LIKED}. Detected when the
 * {@code TransactWriteItems} like write is cancelled by the {@code attribute_not_exists(SK)} guard on
 * the {@code LIKE#} edge, so the counter never double-increments.
 */
public class AlreadyLikedException extends RuntimeException {

private final String userId;

private final String postId;

    /**
     * Creates the exception for a duplicate like.
     *
     * @param userId the caller who already liked
     * @param postId the post already liked
     */
    public AlreadyLikedException(String userId, String postId) {
        super("Already liked: userId=" + userId + ", postId=" + postId);
        this.userId = userId;
        this.postId = postId;
    }

    public String getUserId() {
        return userId;
    }

    public String getPostId() {
        return postId;
    }
}
