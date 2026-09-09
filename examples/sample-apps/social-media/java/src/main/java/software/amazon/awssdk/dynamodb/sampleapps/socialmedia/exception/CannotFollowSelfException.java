package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.exception;

/**
 * Raised when the {@code X-User-Id} follower equals the path {@code targetUserId}.
 *
 * <p>Maps to HTTP {@code 400} with error code {@code CANNOT_FOLLOW_SELF}. Following is one-directional
 * and a user cannot follow their own profile.
 */
public class CannotFollowSelfException extends RuntimeException {

private final String userId;

    /**
     * Creates the exception for a self-follow attempt.
     *
     * @param userId the user id that named itself as both follower and followee
     */
    public CannotFollowSelfException(String userId) {
        super("A user cannot follow themselves: " + userId);
        this.userId = userId;
    }

    public String getUserId() {
        return userId;
    }
}
