package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository;

import java.util.List;
import java.util.concurrent.CompletableFuture;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Repository;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.Message;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.MessageRequest;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.util.EnhancedQueryCollector;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbAsyncTable;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbEnhancedAsyncClient;
import software.amazon.awssdk.enhanced.dynamodb.Key;
import software.amazon.awssdk.enhanced.dynamodb.TableSchema;
import software.amazon.awssdk.enhanced.dynamodb.model.QueryConditional;
import software.amazon.awssdk.enhanced.dynamodb.model.QueryEnhancedRequest;
import software.amazon.awssdk.services.dynamodb.DynamoDbAsyncClient;

/**
 * High-level {@link MessageRepository} using the enhanced client for message queries and its
 * underlying async client for conditional source writes. Selected when
 * {@code dynamodb.client-type=high-level}.
 */
@Repository
@ConditionalOnProperty(name = "dynamodb.client-type", havingValue = "high-level")
public class HighLevelDynamoDbMessageRepository implements MessageRepository {

    private static final Logger logger = LoggerFactory.getLogger(HighLevelDynamoDbMessageRepository.class);

    private final DynamoDbAsyncClient client;
    private final String tableName;
    private final DynamoDbAsyncTable<Message> messageTable;

    /**
     * @param enhancedClient enhanced async client
     * @param tableName      configured Messages table name
     */
    public HighLevelDynamoDbMessageRepository(
            DynamoDbEnhancedAsyncClient enhancedClient,
            @Value("${dynamodb.table-name.messages}") String tableName) {
        this.client = enhancedClient.dynamoDbAsyncClient();
        this.tableName = tableName;
        this.messageTable = enhancedClient.table(tableName, TableSchema.fromBean(Message.class));
        logger.info("Initialized high-level Message repository [tableName={}]", tableName);
    }

    /** {@inheritDoc} */
    @Override
    public CompletableFuture<Void> putMessage(Message message) {
        return MessagePersistenceOperations.putMessage(client, tableName, message);
    }

    /** {@inheritDoc} */
    @Override
    public CompletableFuture<Void> putMessageWithRequest(Message message, MessageRequest messageRequest) {
        return MessagePersistenceOperations.putMessageWithRequest(client, tableName, message, messageRequest);
    }

    /** {@inheritDoc} */
    @Override
    public CompletableFuture<MessageRequest> getMessageRequest(String conversationId, String messageId) {
        return MessagePersistenceOperations.getMessageRequest(client, tableName, conversationId, messageId);
    }

    /** {@inheritDoc} */
    @Override
    public CompletableFuture<List<Message>> queryMessages(String conversationId) {
        QueryConditional conditional = QueryConditional.keyEqualTo(Key.builder()
                .partitionValue(Message.partitionKey(conversationId))
                .build());
        return EnhancedQueryCollector.collectAllItems(
                        messageTable.query(QueryEnhancedRequest.builder().queryConditional(conditional).build()))
                .thenApply(messages -> messages.stream()
                        .filter(message -> Message.ENTITY_TYPE.equals(message.getEntityType()))
                        .toList());
    }
}
