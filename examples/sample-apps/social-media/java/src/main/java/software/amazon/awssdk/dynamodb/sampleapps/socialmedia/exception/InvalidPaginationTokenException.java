package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.exception;

/**
 * Raised when a pagination {@code nextToken} cannot be decoded for the current route, or the decoded
 * key lacks the route-specific discriminator.
 *
 * <p>Maps to HTTP {@code 400} with error code {@code INVALID_PAGINATION_TOKEN}. Tokens are
 * route-specific: a token issued by one list endpoint must not be accepted on another.
 */
public class InvalidPaginationTokenException extends RuntimeException {

    /**
     * Creates the exception for a malformed or wrong-route token.
     *
     * @param nextToken the offending opaque token
     */
    public InvalidPaginationTokenException(String nextToken) {
        super("Invalid pagination token: " + nextToken);
    }

    /**
     * Creates the exception for a token that failed to decode, preserving the underlying cause.
     *
     * @param nextToken the offending opaque token
     * @param cause     the decoding failure
     */
    public InvalidPaginationTokenException(String nextToken, Throwable cause) {
        super("Invalid pagination token: " + nextToken, cause);
    }
}
