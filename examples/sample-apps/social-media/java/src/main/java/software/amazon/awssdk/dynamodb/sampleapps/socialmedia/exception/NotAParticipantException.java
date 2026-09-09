package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.exception;

/**
 * Raised when the {@code X-User-Id} sender of a message is not a participant of the target
 * conversation.
 *
 * <p>Maps to HTTP {@code 400} with error code {@code NOT_A_PARTICIPANT}.
 */
public class NotAParticipantException extends RuntimeException {

private final String userId;

private final String conversationId;

    /**
     * Creates the exception for a non-member sender.
     *
     * @param userId         the sender who is not a participant
     * @param conversationId the target conversation
     */
    public NotAParticipantException(String userId, String conversationId) {
        super("Not a participant: userId=" + userId + ", conversationId=" + conversationId);
        this.userId = userId;
        this.conversationId = conversationId;
    }

    public String getUserId() {
        return userId;
    }

    public String getConversationId() {
        return conversationId;
    }
}
