package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository;

import java.util.List;

import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.TimelineEntry;

/**
 * One page of a home timeline read, returned by
 * {@link TimelineRepository#queryTimeline(String, int, boolean, String)}.
 *
 * <p>Produced by a {@code Query} on {@code GSI_TIMELINE}. The {@code nextToken} is an opaque
 * continuation carrying the {@code timelinePostId} discriminator. It is
 * {@code null} when no further page exists.
 *
 * @param items     timeline entries for this page, newest-first by default
 * @param nextToken opaque next-page token, or {@code null} when the last page was returned
 */
public record TimelinePage(List<TimelineEntry> items, String nextToken) {

    /** Defensive copy so callers cannot mutate the backing list. */
    public TimelinePage {
        items = List.copyOf(items);
    }
}
