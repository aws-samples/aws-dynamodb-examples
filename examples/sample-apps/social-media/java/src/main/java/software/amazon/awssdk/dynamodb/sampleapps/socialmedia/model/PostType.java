package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model;

/**
 * Content item type.
 *
 * <p>A {@link #POST} is durable. A {@link #STORY} carries a numeric {@code expiresAt} so DynamoDB TTL
 * removes the row after expiry. Persisted as the enum {@link #name()} string.
 */
public enum PostType {

    /** A durable post. Fans out to timelines per visibility. */
    POST,

    /** An expiring content with a TTL. Not copied to follower timelines. */
    STORY
}
