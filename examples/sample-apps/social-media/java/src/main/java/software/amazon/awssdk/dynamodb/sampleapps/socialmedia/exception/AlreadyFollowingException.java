package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.exception;

/**
 * Raised when the caller already follows the target.
 *
 * <p>Maps to HTTP {@code 409} with error code {@code ALREADY_FOLLOWING}. Detected when the
 * {@code TransactWriteItems} follow write is cancelled by the {@code attribute_not_exists(SK)} guard
 * on the following edge.
 */
public class AlreadyFollowingException extends RuntimeException {

private final String followerId;

private final String followeeId;

    /**
     * Creates the exception for a duplicate follow.
     *
     * @param followerId the caller who already follows
     * @param followeeId the target already followed
     */
    public AlreadyFollowingException(String followerId, String followeeId) {
        super("Already following: followerId=" + followerId + ", followeeId=" + followeeId);
        this.followerId = followerId;
        this.followeeId = followeeId;
    }

    public String getFollowerId() {
        return followerId;
    }

    public String getFolloweeId() {
        return followeeId;
    }
}
