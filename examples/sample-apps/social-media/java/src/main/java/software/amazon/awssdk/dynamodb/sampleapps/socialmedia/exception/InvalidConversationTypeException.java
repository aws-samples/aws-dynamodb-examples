package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.exception;

/**
 * Raised when a conversation create request carries a {@code type} that is not
 * {@code DIRECT_MESSAGE} or {@code GROUP}.
 *
 * <p>Maps to HTTP {@code 400} with error code {@code INVALID_CONVERSATION_TYPE}.
 */
public class InvalidConversationTypeException extends RuntimeException {

    /**
     * Creates the exception with a client-safe detail message.
     *
     * @param message human-readable reason the type was rejected
     */
    public InvalidConversationTypeException(String message) {
        super(message);
    }
}
