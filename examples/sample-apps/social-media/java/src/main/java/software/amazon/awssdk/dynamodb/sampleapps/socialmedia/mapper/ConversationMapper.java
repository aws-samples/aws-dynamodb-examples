package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.mapper;

import java.util.Comparator;
import java.util.List;

import org.springframework.stereotype.Component;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto.ConversationSnapshotResponse;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto.CreateConversationResponse;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.ConversationMeta;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.ConversationParticipant;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.InboxEntry;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.ConversationSnapshot;

/**
 * Builds Conversations table rows and the conversation-create response shape.
 *
 * <p>Conversation create writes a single {@link ConversationMeta} row, one
 * {@link ConversationParticipant} per member, and one initial {@link InboxEntry} per member with a
 * placeholder preview. Message send later upserts each member's inbox entry with the latest preview
 * and activity time.
 */
@Component
public class ConversationMapper {

public static final int PREVIEW_MAX_CHARS = 200;

public static final String PLACEHOLDER_PREVIEW = "";

    /**
     * Builds the authoritative conversation metadata row.
     *
     * @param conversationId   unique conversation id
     * @param type             conversation type name ({@code DIRECT_MESSAGE} or {@code GROUP})
     * @param title            group title, or {@code null} for a direct message
     * @param participantCount authoritative member count
     * @param createdAt        ISO-8601 UTC creation instant string
     * @return the metadata row keyed by {@code CONVERSATION#{conversationId}} / {@code META}
     */
    public ConversationMeta toMeta(String conversationId, String type, String title,
                                   long participantCount, String createdAt) {
        ConversationMeta meta = new ConversationMeta();
        meta.setPk(ConversationMeta.partitionKey(conversationId));
        meta.setSk(ConversationMeta.SORT_KEY);
        meta.setEntityType(ConversationMeta.ENTITY_TYPE);
        meta.setConversationId(conversationId);
        meta.setType(type);
        meta.setTitle(title);
        meta.setParticipantCount(participantCount);
        meta.setCreatedAt(createdAt);
        meta.setLifecycleState(ConversationMeta.LIFECYCLE_ACTIVE);
        return meta;
    }

    /**
     * Builds one participant (member) row.
     *
     * @param conversationId owning conversation id
     * @param userId         member id
     * @param joinedAt       ISO-8601 UTC join instant string
     * @return the participant row keyed by {@code CONVERSATION#{conversationId}} /
     *     {@code PARTICIPANT#{userId}}
     */
    public ConversationParticipant toParticipant(String conversationId, String userId, String joinedAt) {
        ConversationParticipant participant = new ConversationParticipant();
        participant.setPk(ConversationParticipant.PK_PREFIX + conversationId);
        participant.setSk(ConversationParticipant.sortKey(userId));
        participant.setEntityType(ConversationParticipant.ENTITY_TYPE);
        participant.setUserId(userId);
        participant.setJoinedAt(joinedAt);
        return participant;
    }

    /**
     * Builds one inbox entry for a participant.
     *
     * @param userId             participant whose inbox holds the entry
     * @param conversationId     owning conversation id
     * @param type               conversation type name ({@code DIRECT_MESSAGE} or {@code GROUP})
     * @param title              group title, or {@code null} for a direct message
     * @param lastActivityAt     ISO-8601 UTC activity instant (create time or last message time)
     * @param lastMessagePreview latest message preview, truncated to {@value #PREVIEW_MAX_CHARS} chars
     * @return the inbox entry keyed by {@code USER#{userId}} / {@code INBOX#{conversationId}}
     */
    public InboxEntry toInboxEntry(String userId, String conversationId, String type, String title,
                                   String lastActivityAt, String lastMessagePreview) {
        InboxEntry entry = new InboxEntry();
        entry.setPk(InboxEntry.partitionKey(userId));
        entry.setSk(InboxEntry.sortKey(conversationId));
        entry.setEntityType(InboxEntry.ENTITY_TYPE);
        entry.setInboxUserId(userId);
        entry.setConversationType(type);
        entry.setLastActivityAt(lastActivityAt);
        entry.setConversationId(conversationId);
        entry.setTitle(title);
        entry.setLastMessagePreview(truncatePreview(lastMessagePreview));
        return entry;
    }

    /**
     * Maps committed conversation metadata to the create response shape.
     *
     * @param meta the conversation metadata row
     * @return the response carrying id, type, title, participant count, and creation time
     */
    public CreateConversationResponse toResponse(ConversationMeta meta) {
        long count = meta.getParticipantCount() == null ? 0L : meta.getParticipantCount();
        return new CreateConversationResponse(
                meta.getConversationId(), meta.getType(), meta.getTitle(), count, meta.getCreatedAt());
    }

    /**
     * Maps a coherent conversation snapshot to the read response shape. The
     * {@code participantCount} is the authoritative count from {@code CONVERSATION_META}, and the
     * member list is ordered by {@code userId} ascending so it is stable across reads.
     *
     * @param snapshot the conversation metadata plus its full member list
     * @return the snapshot response with participants ordered by {@code userId}
     */
    public ConversationSnapshotResponse toSnapshotResponse(ConversationSnapshot snapshot) {
        ConversationMeta meta = snapshot.meta();
        long count = meta.getParticipantCount() == null ? 0L : meta.getParticipantCount();
        List<ConversationSnapshotResponse.Participant> participants = snapshot.participants().stream()
                .sorted(Comparator.comparing(ConversationParticipant::getUserId))
                .map(p -> new ConversationSnapshotResponse.Participant(p.getUserId(), p.getJoinedAt()))
                .toList();
        return new ConversationSnapshotResponse(
                meta.getConversationId(), meta.getType(), meta.getTitle(), count,
                meta.getCreatedAt(), participants);
    }

    /** Truncates a preview to at most {@value #PREVIEW_MAX_CHARS} characters. */
    private String truncatePreview(String preview) {
        if (preview == null) {
            return PLACEHOLDER_PREVIEW;
        }
        return preview.length() <= PREVIEW_MAX_CHARS ? preview : preview.substring(0, PREVIEW_MAX_CHARS);
    }
}
