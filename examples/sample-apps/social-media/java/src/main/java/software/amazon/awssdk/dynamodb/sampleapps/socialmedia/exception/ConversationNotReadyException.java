package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.exception;

/** Signals that a chunked conversation create has not produced a coherent active snapshot yet. */
public class ConversationNotReadyException extends RuntimeException {

    private final String conversationId;

    /**
     * @param conversationId conversation whose projection state is incomplete
     */
    public ConversationNotReadyException(String conversationId) {
        super("Conversation is not ready: conversationId=" + conversationId);
        this.conversationId = conversationId;
    }

    public String getConversationId() {
        return conversationId;
    }
}
