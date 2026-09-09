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
import software.amazon.awssdk.services.dynamodb.DynamoDbAsyncClient;

/**
 * Low-level {@link ConversationRepository} using {@link DynamoDbAsyncClient} with attribute maps and
 * package-private conversation operation helpers. Selected when {@code dynamodb.client-type=low-level}.
 */
@Repository
@ConditionalOnProperty(name = "dynamodb.client-type", havingValue = "low-level")
public class LowLevelDynamoDbConversationRepository implements ConversationRepository {

    private static final Logger logger = LoggerFactory.getLogger(LowLevelDynamoDbConversationRepository.class);

    private final DynamoDbAsyncClient client;
    private final String tableName;

    /**
     * @param client    low-level async client
     * @param tableName configured Conversations table name
     */
    public LowLevelDynamoDbConversationRepository(
            DynamoDbAsyncClient client,
            @Value("${dynamodb.table-name.conversations}") String tableName) {
        this.client = client;
        this.tableName = tableName;
        logger.info("Initialized low-level Conversation repository [tableName={}]", tableName);
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
