package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Repository;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.Message;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.MessageRequest;
import software.amazon.awssdk.enhanced.dynamodb.TableSchema;
import software.amazon.awssdk.services.dynamodb.DynamoDbAsyncClient;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;
import software.amazon.awssdk.services.dynamodb.model.QueryRequest;

/**
 * Low-level {@link MessageRepository} using {@link DynamoDbAsyncClient} with attribute maps.
 * Selected when {@code dynamodb.client-type=low-level}.
 */
@Repository
@ConditionalOnProperty(name = "dynamodb.client-type", havingValue = "low-level")
public class LowLevelDynamoDbMessageRepository implements MessageRepository {

    private static final Logger logger = LoggerFactory.getLogger(LowLevelDynamoDbMessageRepository.class);

    private static final TableSchema<Message> SCHEMA = TableSchema.fromBean(Message.class);

    private final DynamoDbAsyncClient client;
    private final String tableName;

    /**
     * @param client    low-level async client
     * @param tableName configured Messages table name
     */
    public LowLevelDynamoDbMessageRepository(
            DynamoDbAsyncClient client,
            @Value("${dynamodb.table-name.messages}") String tableName) {
        this.client = client;
        this.tableName = tableName;
        logger.info("Initialized low-level Message repository [tableName={}]", tableName);
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
        QueryRequest request = QueryRequest.builder()
                .tableName(tableName)
                .keyConditionExpression("PK = :pk")
                .expressionAttributeValues(Map.of(":pk", AttributeValue.fromS(Message.partitionKey(conversationId))))
                .build();
        return drain(request, new ArrayList<>());
    }

    /** Drains every message page under the conversation partition. */
    private CompletableFuture<List<Message>> drain(QueryRequest request, List<Message> acc) {
        return client.query(request).thenCompose(response -> {
            response.items().stream()
                    .filter(item -> Message.ENTITY_TYPE.equals(item.get("entityType").s()))
                    .map(SCHEMA::mapToItem)
                    .forEach(acc::add);
            Map<String, AttributeValue> last = response.lastEvaluatedKey();
            if (last == null || last.isEmpty()) {
                return CompletableFuture.completedFuture(acc);
            }
            return drain(request.toBuilder().exclusiveStartKey(last).build(), acc);
        });
    }
}
