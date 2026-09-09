package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.exception;

/**
 * Raised when a post's {@code visibility} or {@code allowedViewerUserIds} breaks a rule.
 *
 * <p>Maps to HTTP {@code 400} with error code {@code INVALID_VISIBILITY}. Covers a missing or
 * unrecognized {@code visibility}, an {@code allowedViewerUserIds} list that is missing, empty,
 * present when not {@code RESTRICTED}, holds duplicates, exceeds
 * {@code dynamodb.post-restricted-viewers-max}, or names the author.
 */
public class InvalidVisibilityException extends RuntimeException {

    /**
     * Creates the exception with a client-safe detail message.
     *
     * @param message human-readable reason the visibility rule failed
     */
    public InvalidVisibilityException(String message) {
        super(message);
    }
}
