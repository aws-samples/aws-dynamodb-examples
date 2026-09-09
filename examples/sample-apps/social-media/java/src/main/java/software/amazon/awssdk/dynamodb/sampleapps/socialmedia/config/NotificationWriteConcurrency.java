package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.config;

/**
 * Maximum number of conditional notification {@code PutItem} calls that may run at once.
 *
 * @param value accepted concurrency, 1 through 100
 */
public record NotificationWriteConcurrency(int value) {
}
