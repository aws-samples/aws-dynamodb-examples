package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model;

/**
 * Kind of a media attachment.
 *
 * <p>Persisted as the enum {@link #name()} string on each {@code MediaRef}. The {@code kind} must
 * agree with the declared {@code contentType} (an {@link #IMAGE} carries an image MIME type, a
 * {@link #VIDEO} carries a video MIME type).
 */
public enum MediaKind {

    /** A still image attachment (for example {@code image/jpeg}). */
    IMAGE,

    /** A video attachment (for example {@code video/mp4}). */
    VIDEO
}
