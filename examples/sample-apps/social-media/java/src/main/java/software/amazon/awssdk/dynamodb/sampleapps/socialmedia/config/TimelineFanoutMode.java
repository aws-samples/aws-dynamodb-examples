package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.config;

import java.util.Locale;

/**
 * Timing of home-timeline fan-out after a post source row is written.
 *
 * <p>Parsed from {@code dynamodb.timeline-fanout-mode}. Matching is case-insensitive.
 */
public enum TimelineFanoutMode {

    /** Write timeline rows during the publish request. */
    SYNC,

    /** Defer timeline rows to the in-process stream consumer. */
    ASYNC;

    /**
     * Parses {@code dynamodb.timeline-fanout-mode} into a canonical value.
     *
     * @param value configured mode
     * @return {@link #SYNC} or {@link #ASYNC}
     * @throws IllegalStateException when the value is blank or not {@code SYNC} or {@code ASYNC}
     */
    public static TimelineFanoutMode fromProperty(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalStateException("dynamodb.timeline-fanout-mode must be SYNC or ASYNC");
        }
        try {
            return TimelineFanoutMode.valueOf(value.strip().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new IllegalStateException("dynamodb.timeline-fanout-mode must be SYNC or ASYNC");
        }
    }
}
