package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.stream;

/**
 * Named tuning constants for the in-process DynamoDB Streams poller.
 *
 * <p>Every value below is a deliberate trade-off rather than a hard limit, so each carries a short
 * "why this value" note. Keeping them as named constants instead of inline literals makes a
 * considered deviation auditable.
 */
public final class StreamProcessingConstants {

public static final long POLL_INTERVAL_MILLIS = 1000L;

public static final int GET_RECORDS_LIMIT = 100;

public static final int MAX_GET_RECORDS_ROUNDS = 512;

public static final long STARTUP_DELAY_MILLIS = 2000L;

public static final int MAX_PROCESS_RETRIES = 3;

public static final int MAX_RETRY_COUNT_ENTRIES = 1024;

public static final int SHUTDOWN_AWAIT_SECONDS = 10;

public static final long NOTIFICATION_TTL_SECONDS = 7L * 24L * 60L * 60L;

    /** Utility class, not instantiated. */
    private StreamProcessingConstants() {
    }
}
