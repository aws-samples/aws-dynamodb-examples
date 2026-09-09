package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.util;

import java.security.SecureRandom;
import java.util.UUID;

/**
 * Generates canonical identifiers for domain entities.
 *
 * <p>Identifiers are generated once at create time and then embedded into DynamoDB keys with the
 * canonical prefixes defined in the data model. Two shapes are provided:
 * <ul>
 *   <li>{@link #randomId()}: a plain UUID without hyphens, used for identifiers that do not need
 *       lexical time ordering (for example {@code mediaId}, {@code notificationId}).</li>
 *   <li>{@link #timeOrderedId()}: a lexically sortable, time-prefixed identifier (ULID-style) for
 *       identifiers that benefit from monotonic ordering inside a partition (for example
 *       {@code postId}, {@code messageId}).</li>
 * </ul>
 *
 * <p>Sort keys still embed the ISO-8601 {@code createdAt} timestamp for ordering. The time-ordered
 * identifier is a tie-breaker that keeps two writes in the same millisecond ordered deterministically.
 */
public final class IdGenerator {

private static final char[] CROCKFORD_BASE32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ".toCharArray();

private static final int RANDOM_CHARS = 16;

private static final int TIME_CHARS = 10;

private static final SecureRandom RANDOM = new SecureRandom();

    /** Utility class, not instantiated. */
    private IdGenerator() {
    }

    /**
     * Generates a plain UUID with the hyphens removed.
     *
     * @return a 32-character lowercase hexadecimal identifier
     */
    public static String randomId() {
        return UUID.randomUUID().toString().replace("-", "");
    }

    /**
     * Generates a lexically sortable, time-prefixed identifier (ULID-style, Crockford Base32).
     *
     * <p>The first {@value #TIME_CHARS} characters encode the current epoch millisecond so
     * identifiers sort in creation order. The remaining {@value #RANDOM_CHARS} characters are random.
     *
     * @return a 26-character uppercase Base32 identifier
     */
    public static String timeOrderedId() {
        long timestamp = System.currentTimeMillis();
        StringBuilder sb = new StringBuilder(TIME_CHARS + RANDOM_CHARS);

        char[] time = new char[TIME_CHARS];
        for (int i = TIME_CHARS - 1; i >= 0; i--) {
            time[i] = CROCKFORD_BASE32[(int) (timestamp & 0x1f)];
            timestamp >>>= 5;
        }
        sb.append(time);

        for (int i = 0; i < RANDOM_CHARS; i++) {
            sb.append(CROCKFORD_BASE32[RANDOM.nextInt(CROCKFORD_BASE32.length)]);
        }
        return sb.toString();
    }
}
