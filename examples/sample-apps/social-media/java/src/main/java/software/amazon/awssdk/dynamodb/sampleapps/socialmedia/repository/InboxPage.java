package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository;

import java.util.List;

import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.InboxEntry;

/**
 * One page of an inbox read, returned by
 * {@link ConversationRepository#queryInbox(String, String, int, boolean, String)}.
 *
 * <p>Produced by a {@code Query} on {@code GSI_INBOX} (single query with a {@code type} filter, or a
 * merged two-query mode when no type is supplied). In merged mode, the {@code nextToken} records
 * each branch as {@code START}, {@code AFTER_KEY}, or {@code EXHAUSTED}, so a drained branch does
 * not restart and fetched rows that were not emitted remain available. It is {@code null} only when
 * both branches are exhausted.
 *
 * @param items     inbox entries for this page, most-recent activity first by default
 * @param nextToken opaque next-page token, or {@code null} when the last page was returned
 */
public record InboxPage(List<InboxEntry> items, String nextToken) {

    /** Defensive copy so callers cannot mutate the backing list. */
    public InboxPage {
        items = List.copyOf(items);
    }
}
