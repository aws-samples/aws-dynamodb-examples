package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.exception;

/**
 * Raised for a request-shape rule that Bean Validation cannot express declaratively.
 *
 * <p>Maps to HTTP {@code 400} with error code {@code VALIDATION_ERROR}, matching the framework
 * validation failures. Used, for example, when a post carries neither text nor a media attachment.
 */
public class ValidationException extends RuntimeException {

    /**
     * Creates the exception with a client-safe detail message.
     *
     * @param message human-readable reason the request was rejected
     */
    public ValidationException(String message) {
        super(message);
    }
}
