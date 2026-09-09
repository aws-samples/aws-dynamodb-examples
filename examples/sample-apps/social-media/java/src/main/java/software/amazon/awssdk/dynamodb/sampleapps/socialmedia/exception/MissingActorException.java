package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.exception;

/**
 * Raised when a route that acts on behalf of a signed-in user receives a missing or blank
 * {@code X-User-Id} header.
 *
 * <p>Maps to HTTP {@code 400} with error code {@code VALIDATION_ERROR}. The actor (who performs the
 * action) is always taken from the header, never from the body or path, so an absent actor is a
 * request-shape failure rather than a not-found.
 */
public class MissingActorException extends RuntimeException {

    /**
     * Creates the exception naming the required header.
     */
    public MissingActorException() {
        super("X-User-Id header is required and must not be blank");
    }
}
