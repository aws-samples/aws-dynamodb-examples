package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.exception;

/**
 * Raised when a post {@code type} is not a recognized value.
 *
 * <p>Maps to HTTP {@code 400} with error code {@code INVALID_POST_TYPE}. The publish route defaults
 * {@code type} to {@code POST}. A {@code POST} materializes durable content and a
 * {@code expiring content} materializes expiring content with a TTL. Any other value is rejected here.
 */
public class InvalidPostTypeException extends RuntimeException {

    /**
     * Creates the exception with a client-safe detail message.
     *
     * @param message human-readable reason the post type was rejected
     */
    public InvalidPostTypeException(String message) {
        super(message);
    }
}
