package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository;

import java.util.Map;
import java.util.concurrent.CompletableFuture;

import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.Message;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.MessageRequest;
import software.amazon.awssdk.enhanced.dynamodb.TableSchema;
import software.amazon.awssdk.services.dynamodb.DynamoDbAsyncClient;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;
import software.amazon.awssdk.services.dynamodb.model.GetItemRequest;
import software.amazon.awssdk.services.dynamodb.model.Put;
import software.amazon.awssdk.services.dynamodb.model.PutItemRequest;
import software.amazon.awssdk.services.dynamodb.model.TransactWriteItem;
import software.amazon.awssdk.services.dynamodb.model.TransactWriteItemsRequest;

/**
 * Shared low-level writes for message source rows and replay records.
 *
 * <p>Both message repository variants use these operations so an idempotency record and its message
 * become visible together, even though inbox projection fan-out happens later.
 */
final class MessagePersistenceOperations {

    private static final TableSchema<Message> MESSAGE_SCHEMA = TableSchema.fromBean(Message.class);
    private static final TableSchema<MessageRequest> REQUEST_SCHEMA = TableSchema.fromBean(MessageRequest.class);

    /** Utility class, not instantiated. */
    private MessagePersistenceOperations() {
    }

    /** Persists a non-replayable message without permitting a generated-key overwrite. */
    static CompletableFuture<Void> putMessage(DynamoDbAsyncClient client, String tableName, Message message) {
        PutItemRequest request = PutItemRequest.builder()
                .tableName(tableName)
                .item(MESSAGE_SCHEMA.itemToMap(message, true))
                .conditionExpression("attribute_not_exists(SK)")
                .build();
        return client.putItem(request).thenApply(ignored -> null);
    }

    /** Atomically creates a message and its stable replay record. */
    static CompletableFuture<Void> putMessageWithRequest(DynamoDbAsyncClient client, String tableName,
                                                          Message message, MessageRequest messageRequest) {
        TransactWriteItem messagePut = conditionalPut(tableName, MESSAGE_SCHEMA.itemToMap(message, true));
        TransactWriteItem requestPut = conditionalPut(tableName, REQUEST_SCHEMA.itemToMap(messageRequest, true));
        TransactWriteItemsRequest request = TransactWriteItemsRequest.builder()
                .transactItems(messagePut, requestPut)
                .build();
        return client.transactWriteItems(request).thenApply(ignored -> null);
    }

    static CompletableFuture<MessageRequest> getMessageRequest(DynamoDbAsyncClient client, String tableName,
                                                                String conversationId, String messageId) {
        GetItemRequest request = GetItemRequest.builder()
                .tableName(tableName)
                .key(RepositoryKeys.pkSk(Message.partitionKey(conversationId), MessageRequest.sortKey(messageId)))
                .consistentRead(true)
                .build();
        return client.getItem(request).thenApply(response -> response.hasItem()
                ? REQUEST_SCHEMA.mapToItem(response.item()) : null);
    }

    /** Builds one create-once transaction item. */
    private static TransactWriteItem conditionalPut(String tableName, Map<String, AttributeValue> item) {
        return TransactWriteItem.builder().put(Put.builder()
                .tableName(tableName)
                .item(item)
                .conditionExpression("attribute_not_exists(SK)")
                .build()).build();
    }
}
