package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.exception;

/**
 * Raised when a referenced {@code userId} has no profile.
 *
 * <p>Maps to HTTP {@code 404} with error code {@code USER_NOT_FOUND}. In  this covers both an
 * unknown follower (the {@code X-User-Id} caller) and an unknown followee (the path
 * {@code targetUserId}).
 */
public class UserNotFoundException extends RuntimeException {

private final String userId;

    /**
     * Creates the exception for a missing profile.
     *
     * @param userId the user id with no profile
     */
    public UserNotFoundException(String userId) {
        super("User not found: " + userId);
        this.userId = userId;
    }

    public String getUserId() {
        return userId;
    }
}
