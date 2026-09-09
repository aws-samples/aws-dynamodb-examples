package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository;

import java.util.List;
import java.util.concurrent.CompletableFuture;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Repository;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.ConversationMeta;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.ConversationParticipant;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.InboxEntry;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbEnhancedAsyncClient;
import software.amazon.awssdk.services.dynamodb.DynamoDbAsyncClient;

/**
 * High-level {@link ConversationRepository}. Conversation create (chunked
 * {@code TransactWriteItems}), inbox fan-out ({@code BatchWriteItem}), and the composite-key
 * {@code GSI_INBOX} read use the low-level client obtained from the enhanced client, with bean
 * mapping flowing through package-private conversation operation helpers. Selected when
 * {@code dynamodb.client-type=high-level}.
 */
@Repository
@ConditionalOnProperty(name = "dynamodb.client-type", havingValue = "high-level")
public class HighLevelDynamoDbConversationRepository implements ConversationRepository {

    private static final Logger logger = LoggerFactory.getLogger(HighLevelDynamoDbConversationRepository.class);

    private final DynamoDbAsyncClient client;
    private final String tableName;

    /**
     * @param enhancedClient enhanced async client (supplies the underlying low-level client)
     * @param tableName      configured Conversations table name
     */
    public HighLevelDynamoDbConversationRepository(
            DynamoDbEnhancedAsyncClient enhancedClient,
            @Value("${dynamodb.table-name.conversations}") String tableName) {
        this.client = enhancedClient.dynamoDbAsyncClient();
        this.tableName = tableName;
        logger.info("Initialized high-level Conversation repository [tableName={}]", tableName);
    }

    /** {@inheritDoc} */
    @Override
    public CompletableFuture<Void> createConversation(ConversationMeta meta,
                                                      List<ConversationParticipant> participants) {
        return ConversationWriteOperations.createConversation(client, tableName, meta, participants);
    }

    /** {@inheritDoc} */
    @Override
    public CompletableFuture<Void> repairParticipants(List<ConversationParticipant> participants) {
        return ConversationWriteOperations.repairParticipants(client, tableName, participants);
    }

    /** {@inheritDoc} */
    @Override
    public CompletableFuture<Void> activateConversation(String conversationId) {
        return ConversationWriteOperations.activateConversation(client, tableName, conversationId);
    }

    /** {@inheritDoc} */
    @Override
    public CompletableFuture<Void> fanOutInbox(List<InboxEntry> entries, int chunkSize) {
        return ConversationWriteOperations.fanOutInbox(client, tableName, entries, chunkSize, logger);
    }

    /** {@inheritDoc} */
    @Override
    public CompletableFuture<ConversationMeta> getConversationMeta(String conversationId) {
        return ConversationReadOperations.getConversationMeta(client, tableName, conversationId);
    }

    /** {@inheritDoc} */
    @Override
    public CompletableFuture<ConversationParticipant> getParticipant(String conversationId, String userId) {
        return ConversationReadOperations.getParticipant(client, tableName, conversationId, userId);
    }

    /** {@inheritDoc} */
    @Override
    public CompletableFuture<ConversationSnapshot> getSnapshot(String conversationId) {
        return ConversationReadOperations.getSnapshot(client, tableName, conversationId);
    }

    /** {@inheritDoc} */
    @Override
    public CompletableFuture<List<ConversationParticipant>> queryParticipants(String conversationId) {
        return ConversationReadOperations.queryParticipants(client, tableName, conversationId);
    }

    /** {@inheritDoc} */
    @Override
    public CompletableFuture<InboxPage> queryInbox(String userId,
                                                   String type,
                                                   int limit,
                                                   boolean scanIndexForward,
                                                   String nextToken) {
        return InboxQueryOperations.queryInbox(client, tableName, userId, type, limit, scanIndexForward, nextToken);
    }
}
