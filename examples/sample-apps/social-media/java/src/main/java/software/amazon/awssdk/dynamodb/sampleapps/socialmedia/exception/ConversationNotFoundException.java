package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.exception;

/**
 * Raised when a conversation referenced by a message send or a snapshot read has no
 * {@code CONVERSATION#} metadata.
 *
 * <p>Maps to HTTP {@code 404} with error code {@code CONVERSATION_NOT_FOUND}.
 */
public class ConversationNotFoundException extends RuntimeException {

private final String conversationId;

    /**
     * Creates the exception for a missing conversation.
     *
     * @param conversationId the conversation id that is absent
     */
    public ConversationNotFoundException(String conversationId) {
        super("Conversation not found: conversationId=" + conversationId);
        this.conversationId = conversationId;
    }

    public String getConversationId() {
        return conversationId;
    }
}
