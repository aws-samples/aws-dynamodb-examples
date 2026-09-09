package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.config;

/**
 * Maximum number of follower edges read for {@code PUBLIC} timeline fan-out and post notifications.
 *
 * @param value accepted cap, 1 through 10000
 */
public record FollowerFanoutCap(int value) {
}
