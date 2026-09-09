package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model;

/**
 * Post and expiring content visibility.
 *
 * <p>Persisted as the enum {@link #name()} string on {@code POST_META}, {@code USER_POST}, and the
 * denormalized {@code TIMELINE_ENTRY} rows. Governs timeline fan-out, reads, and * notification recipient derivation.
 */
public enum Visibility {

    /** Fans out to every follower. Openable by any signed-in user who knows the post id. */
    PUBLIC,

    /** Stays on the author profile only. No follower timelines and no notifications. */
    PRIVATE,

    /** Fans out only to the ids in {@code allowedViewerUserIds}. */
    RESTRICTED
}
