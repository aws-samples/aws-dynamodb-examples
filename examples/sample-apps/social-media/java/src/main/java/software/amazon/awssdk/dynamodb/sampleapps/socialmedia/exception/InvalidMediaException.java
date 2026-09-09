package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.exception;

/**
 * Raised when a media attachment breaks a validation rule.
 *
 * <p>Maps to HTTP {@code 400} with error code {@code INVALID_MEDIA}. Covers a disallowed
 * {@code kind}/{@code contentType}, a {@code kind} that disagrees with the {@code contentType}, an
 * oversized object (over {@code media.max-image-bytes}/{@code media.max-video-bytes}), or too many
 * attachments (a post over {@code media.max-per-post} or an expiring content over one).
 */
public class InvalidMediaException extends RuntimeException {

    /**
     * Creates the exception with a client-safe detail message.
     *
     * @param message human-readable reason the media rule failed
     */
    public InvalidMediaException(String message) {
        super(message);
    }
}
