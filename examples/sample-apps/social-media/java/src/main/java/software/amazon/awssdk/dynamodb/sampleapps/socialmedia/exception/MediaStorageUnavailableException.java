package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.exception;

/**
 * Raised when the object store (Amazon S3 or an S3-compatible store) is transiently unavailable
 * during media validation or presigned-URL generation.
 *
 * <p>Maps to HTTP {@code 503} with error code {@code MEDIA_STORAGE_UNAVAILABLE} and a fixed
 * {@code Retry-After: 1} header. Used for transient S3 faults that are distinct from a missing
 * object ({@code MEDIA_NOT_FOUND}).
 */
public class MediaStorageUnavailableException extends RuntimeException {

    /**
     * Creates the exception wrapping the underlying object-store fault.
     *
     * @param message human-readable, client-safe description
     * @param cause   the underlying object-store failure
     */
    public MediaStorageUnavailableException(String message, Throwable cause) {
        super(message, cause);
    }
}
