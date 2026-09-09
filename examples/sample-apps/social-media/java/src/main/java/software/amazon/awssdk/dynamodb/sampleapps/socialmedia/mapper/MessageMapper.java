package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.mapper;

import org.springframework.stereotype.Component;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto.SendMessageResponse;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.Message;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.MessageRequest;

/**
 * Builds the message row and response shape.
 *
 * <p>A send appends one append-only {@link Message} keyed by {@code CONVERSATION#{conversationId}} /
 * {@code MESSAGE#{createdAt}#{messageId}} in the Messages table. The insert drives notification projection through the Messages stream.
 */
@Component
public class MessageMapper {

    /**
     * Builds the message row for a send.
     *
     * @param messageId      unique message id
     * @param conversationId owning conversation id
     * @param senderId       the participant who sent the message
     * @param text           the message body
     * @param createdAt      ISO-8601 UTC creation instant string
     * @return the message row
     */
    public Message toMessage(String messageId, String conversationId, String senderId, String text,
                             String createdAt) {
        Message message = new Message();
        message.setPk(Message.partitionKey(conversationId));
        message.setSk(Message.sortKey(createdAt, messageId));
        message.setEntityType(Message.ENTITY_TYPE);
        message.setMessageId(messageId);
        message.setConversationId(conversationId);
        message.setSenderId(senderId);
        message.setText(text);
        message.setCreatedAt(createdAt);
        return message;
    }

    /**
     * Maps a committed message to the API response shape.
     *
     * @param message the appended message row
     * @return the response carrying id, conversation, sender, text, and creation time
     */
    public SendMessageResponse toResponse(Message message) {
        return new SendMessageResponse(
                message.getMessageId(), message.getConversationId(), message.getSenderId(),
                message.getText(), message.getCreatedAt());
    }

    /**
     * Maps a durable message replay record to the original API response shape.
     *
     * @param messageRequest replay record atomically created with the message
     * @return the original send response
     */
    public SendMessageResponse toResponse(MessageRequest messageRequest) {
        return new SendMessageResponse(
                messageRequest.getMessageId(), messageRequest.getConversationId(), messageRequest.getSenderId(),
                messageRequest.getText(), messageRequest.getCreatedAt());
    }

    /**
     * Builds the durable request record that accompanies a replayable message write.
     *
     * @param message source message row
     * @param requestFingerprint canonical sender and text fingerprint
     * @return record keyed by the stable message identity
     */
    public MessageRequest toRequest(Message message, String requestFingerprint) {
        MessageRequest request = new MessageRequest();
        request.setPk(message.getPk());
        request.setSk(MessageRequest.sortKey(message.getMessageId()));
        request.setEntityType(MessageRequest.ENTITY_TYPE);
        request.setMessageId(message.getMessageId());
        request.setConversationId(message.getConversationId());
        request.setSenderId(message.getSenderId());
        request.setText(message.getText());
        request.setCreatedAt(message.getCreatedAt());
        request.setRequestFingerprint(requestFingerprint);
        return request;
    }
}
