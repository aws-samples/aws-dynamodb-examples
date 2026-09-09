package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model;

/**
 * Source of a stream-projected notification.
 *
 * <p>Persisted as the enum {@link #name()} string on {@code NOTIFICATION} rows. Identifies whether
 * the alert was triggered by a post insert or a message insert.
 */
public enum SourceType {

    /** Notification triggered by a {@code POST_META} insert. */
    POST,

    /** Notification triggered by a {@code MESSAGE} insert. */
    MESSAGE
}
