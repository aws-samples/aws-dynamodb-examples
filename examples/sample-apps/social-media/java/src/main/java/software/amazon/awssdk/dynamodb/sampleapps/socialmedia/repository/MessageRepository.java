package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository;

import java.util.List;
import java.util.concurrent.CompletableFuture;

import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.Message;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.MessageRequest;

/**
 * Persistence boundary for the Messages table: append-only conversation history.
 *
 * <p>Two implementations are selected at startup by {@code dynamodb.client-type}. Both keep DynamoDB
 * I/O async end-to-end. Message-history pagination is a non-goal, so the read here is a bounded
 * partition query used for verification and internal flows only.
 */
public interface MessageRepository {

    /**
     * Appends one non-replayable message with a conditional {@code PutItem}. The {@code MESSAGE}
     * insert drives notification projection through the Messages stream.
     *
     * @param message the message row to append
     * @return future completing when the row is written
     */
    CompletableFuture<Void> putMessage(Message message);

    /**
     * Atomically creates a replayable message and the durable record for its client request id.
     *
     * @param message source message row
     * @param messageRequest stable request record that maps the request to the message
     * @return future completing when both source rows have been persisted
     */
    CompletableFuture<Void> putMessageWithRequest(Message message, MessageRequest messageRequest);

    CompletableFuture<MessageRequest> getMessageRequest(String conversationId, String messageId);

    /**
     * Queries all messages under a conversation partition in sort-key order, draining pages. Request
     * records are filtered out before mapping the result.
     *
     * @param conversationId owning conversation id
     * @return the messages, oldest-first, empty when the conversation has no messages
     */
    CompletableFuture<List<Message>> queryMessages(String conversationId);
}
