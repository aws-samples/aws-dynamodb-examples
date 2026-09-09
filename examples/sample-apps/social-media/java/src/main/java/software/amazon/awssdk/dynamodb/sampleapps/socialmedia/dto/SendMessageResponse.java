package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto;

/**
 * Response body for {@code POST /api/v1/conversations/{conversationId}/messages}.
 *
 * <p>Returned with HTTP {@code 201} after the message row is appended and every participant's inbox
 * entry is upserted. The sender is the {@code X-User-Id} caller and the conversation is the path
 * {@code conversationId}.
 *
 * @param messageId      the newly appended message id
 * @param conversationId the owning conversation id
 * @param senderId       the caller who sent the message
 * @param text           the message body
 * @param createdAt      creation instant as an ISO-8601 UTC string (for example {@code 2026-05-27T13:00:00Z})
 */
public record SendMessageResponse(
        String messageId,
        String conversationId,
        String senderId,
        String text,
        String createdAt) {
}
