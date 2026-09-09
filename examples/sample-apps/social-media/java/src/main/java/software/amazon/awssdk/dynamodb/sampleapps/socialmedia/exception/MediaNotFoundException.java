package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.exception;

/**
 * Raised when a referenced {@code mediaId} was never presigned or its S3 object is not present
 * because the upload was not completed.
 *
 * <p>Maps to HTTP {@code 404} with error code {@code MEDIA_NOT_FOUND}. Media must be uploaded before
 * the post that references it (the two-phase presigned flow), so an unknown or not-yet-uploaded
 * attachment is a not-found rather than a validation failure.
 */
public class MediaNotFoundException extends RuntimeException {

private final String mediaId;

    /**
     * Creates the exception for a missing media object.
     *
     * @param mediaId the referenced media id with no uploaded object
     */
    public MediaNotFoundException(String mediaId) {
        super("Media not found or not uploaded: " + mediaId);
        this.mediaId = mediaId;
    }

    public String getMediaId() {
        return mediaId;
    }
}
