package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository;

import java.util.List;
import java.util.concurrent.CompletableFuture;

import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.ConversationMeta;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.ConversationParticipant;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.InboxEntry;

/**
 * Persistence boundary for the Conversations table: metadata, participants, inbox fan-out, and the
 * {@code GSI_INBOX} read.
 *
 * <p>Two implementations are selected at startup by {@code dynamodb.client-type}. Both keep DynamoDB
 * I/O async end-to-end.
 */
public interface ConversationRepository {

    /**
     * Creates a conversation with chunked single-table {@code TransactWriteItems}: the first chunk
     * holds {@code META} plus up to 99 participants, later chunks hold up to 100 participants each.
     * Every write is conditional ({@code attribute_not_exists} on {@code META} PK and participant SK)
     * so the create is idempotent across chunk boundaries.
     *
     * @param meta         the conversation metadata row
     * @param participants the participant rows (creator included)
     * @return future completing when every chunk commits
     */
    CompletableFuture<Void> createConversation(ConversationMeta meta,
                                               List<ConversationParticipant> participants);

    /**
     * Adds only the missing member rows for a replayable conversation create. Each row is written
     * conditionally, so a retry after another repairer has made progress is safe.
     *
     * @param participants missing participant rows to persist
     * @return future completing when all supplied rows exist
     */
    CompletableFuture<Void> repairParticipants(List<ConversationParticipant> participants);

    /**
     * Marks a fully persisted conversation as readable after its participants and inbox rows exist.
     *
     * @param conversationId conversation to activate
     * @return future completing when the lifecycle transition commits
     */
    CompletableFuture<Void> activateConversation(String conversationId);

    /**
     * Upserts one inbox entry per participant across as many {@code BatchWriteItem} chunks as the
     * group requires, draining {@code UnprocessedItems} (message-send fan-out).
     *
     * @param entries   one inbox entry per participant
     * @param chunkSize maximum writes per batch (hard-capped at 25 by the caller)
     * @return future completing when every entry is written
     */
    CompletableFuture<Void> fanOutInbox(List<InboxEntry> entries, int chunkSize);

    CompletableFuture<ConversationMeta> getConversationMeta(String conversationId);

    CompletableFuture<ConversationParticipant> getParticipant(String conversationId, String userId);

    CompletableFuture<ConversationSnapshot> getSnapshot(String conversationId);

    /**
     * Queries only {@code PARTICIPANT#} rows for a conversation with a strongly consistent
     * {@code Query}.
     *
     * <p>Pages of up to 100 items are drained so a group up to
     * {@code dynamodb.conversation-participant-max} is returned in full. Conversation metadata is not
     * read. {@code TransactGetItems} is not used. Message notification projection uses this path
     * instead of {@link #getSnapshot(String)}.
     *
     * @param conversationId conversation whose members are listed
     * @return participant rows in sort-key order, empty when none exist
     */
    CompletableFuture<List<ConversationParticipant>> queryParticipants(String conversationId);

    /**
     * Reads one page of an inbox via a {@code Query} on {@code GSI_INBOX}. When {@code type}
     * is supplied a single query is used. When {@code type} is {@code null} the two conversation types
     * are queried and merge-sorted by {@code lastActivityAt}. Its opaque token tracks each branch as
     * {@code START}, {@code AFTER_KEY}, or {@code EXHAUSTED}, preventing an exhausted branch from
     * restarting while retaining fetched rows that were not emitted. Eventually consistent for a GSI
     * read.
     *
     * @param userId           inbox owner (GSI partition value)
     * @param type             {@code DIRECT_MESSAGE}, {@code GROUP}, or {@code null} for the merged mode
     * @param limit            maximum items to return
     * @param scanIndexForward {@code false} for most-recent activity first
     * @param nextToken        opaque continuation from a prior page, or {@code null} for the first page
     * @return a page of inbox entries plus an optional next-page token
     */
    CompletableFuture<InboxPage> queryInbox(String userId,
                                            String type,
                                            int limit,
                                            boolean scanIndexForward,
                                            String nextToken);
}
