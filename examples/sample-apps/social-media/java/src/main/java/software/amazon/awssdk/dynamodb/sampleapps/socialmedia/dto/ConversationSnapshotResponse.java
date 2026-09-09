package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto;

import java.util.List;

/**
 * Response body for {@code GET /api/v1/conversations/{conversationId}}.
 *
 * <p>A coherent snapshot of the conversation metadata plus its full member list. {@code title} is a
 * string for a {@code GROUP} and {@code null} for a {@code DIRECT_MESSAGE}. {@code participantCount}
 * is the authoritative count from the {@code CONVERSATION_META} row, and {@code participants} is
 * ordered by {@code userId} ascending so the list is stable across reads. No message history and no
 * pagination.
 *
 * @param conversationId   echoes the path conversation id
 * @param type             conversation type, {@code DIRECT_MESSAGE} or {@code GROUP}
 * @param title            group title, or {@code null} for a direct message
 * @param participantCount authoritative member count from {@code CONVERSATION_META}
 * @param createdAt        creation instant as an ISO-8601 UTC string (for example {@code 2026-01-04T00:00:00Z})
 * @param participants     members ordered by {@code userId} ascending
 */
public record ConversationSnapshotResponse(
        String conversationId,
        String type,
        String title,
        long participantCount,
        String createdAt,
        List<Participant> participants) {

    /**
     * One conversation member in the snapshot.
     *
     * @param userId   member id
     * @param joinedAt join instant as an ISO-8601 UTC string
     */
    public record Participant(String userId, String joinedAt) {
    }
}
