package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto;

/**
 * Response body for {@code POST /api/v1/conversations}.
 *
 * <p>Returned with HTTP {@code 201} after the conversation metadata, participant rows, and initial
 * inbox entries are written. {@code title} is {@code null} for a {@code DIRECT_MESSAGE} and carries
 * the group name for a {@code GROUP}.
 *
 * @param conversationId   the newly created conversation id
 * @param type             conversation type, {@code DIRECT_MESSAGE} or {@code GROUP}
 * @param title            group title, or {@code null} for a direct message
 * @param participantCount authoritative member count
 * @param createdAt        creation instant as an ISO-8601 UTC string (for example {@code 2026-05-27T12:00:00Z})
 */
public record CreateConversationResponse(
        String conversationId,
        String type,
        String title,
        long participantCount,
        String createdAt) {
}
