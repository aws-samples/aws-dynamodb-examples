package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository;

import java.util.List;
import java.util.concurrent.CompletableFuture;

import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.TimelineEntry;

/**
 * Persistence boundary for the Timelines table: fan-out writes and the {@code GSI_TIMELINE} read.
 *
 * <p>Two implementations are selected at startup by {@code dynamodb.client-type}. Both keep DynamoDB
 * I/O async end-to-end.
 */
public interface TimelineRepository {

    /**
     * Fans out timeline copies to every recipient across as many {@code BatchWriteItem} chunks as
     * needed, draining {@code UnprocessedItems} between chunks so no recipient is silently skipped
     * (SYNC fan-out, ASYNC fan-out).
     *
     * @param entries   one timeline entry per eligible recipient
     * @param chunkSize maximum writes per batch (hard-capped at 25 by the caller)
     * @return future completing when every entry is written
     */
    CompletableFuture<Void> fanOut(List<TimelineEntry> entries, int chunkSize);

    /**
     * Reads one page of a home timeline via a {@code Query} on {@code GSI_TIMELINE} ordered by time.
     * Eventually consistent by definition for a GSI read.
     *
     * @param userId           timeline owner (GSI partition value)
     * @param limit            maximum items to return
     * @param scanIndexForward {@code false} for newest-first, {@code true} for oldest-first
     * @param nextToken        opaque continuation from a prior page, or {@code null} for the first page
     * @return a page of timeline entries plus an optional next-page token
     */
    CompletableFuture<TimelinePage> queryTimeline(String userId,
                                                  int limit,
                                                  boolean scanIndexForward,
                                                  String nextToken);
}
