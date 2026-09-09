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
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.Notification;
import software.amazon.awssdk.enhanced.dynamodb.TableSchema;
import software.amazon.awssdk.services.dynamodb.DynamoDbAsyncClient;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;
import software.amazon.awssdk.services.dynamodb.model.PutItemRequest;
import software.amazon.awssdk.services.dynamodb.model.QueryRequest;

/**
 * Low-level {@link NotificationRepository} using {@link DynamoDbAsyncClient} with attribute maps.
 * Selected when {@code dynamodb.client-type=low-level}.
 */
@Repository
@ConditionalOnProperty(name = "dynamodb.client-type", havingValue = "low-level")
public class LowLevelDynamoDbNotificationRepository implements NotificationRepository {

    private static final Logger logger = LoggerFactory.getLogger(LowLevelDynamoDbNotificationRepository.class);

    private static final TableSchema<Notification> SCHEMA = TableSchema.fromBean(Notification.class);

    private final DynamoDbAsyncClient client;
    private final String tableName;

    /**
     * @param client    low-level async client
     * @param tableName configured Notifications table name
     */
    public LowLevelDynamoDbNotificationRepository(
            DynamoDbAsyncClient client,
            @Value("${dynamodb.table-name.notifications}") String tableName) {
        this.client = client;
        this.tableName = tableName;
        logger.info("Initialized low-level Notification repository [tableName={}]", tableName);
    }

    /** {@inheritDoc} */
    @Override
    public CompletableFuture<Boolean> putNotificationIfAbsent(Notification notification) {
        PutItemRequest request = PutItemRequest.builder()
                .tableName(tableName)
                .item(SCHEMA.itemToMap(notification, true))
                .conditionExpression("attribute_not_exists(SK)")
                .build();
        return ConditionalWriteSupport.createdOrDuplicate(client.putItem(request));
    }

    /** {@inheritDoc} */
    @Override
    public CompletableFuture<List<Notification>> queryNotifications(String recipientUserId) {
        QueryRequest request = QueryRequest.builder()
                .tableName(tableName)
                .keyConditionExpression("PK = :pk")
                .expressionAttributeValues(Map.of(
                        ":pk", AttributeValue.fromS(Notification.partitionKey(recipientUserId))))
                .build();
        return drain(request, new ArrayList<>());
    }

    /** Drains every notification page under the recipient partition. */
    private CompletableFuture<List<Notification>> drain(QueryRequest request, List<Notification> acc) {
        return client.query(request).thenCompose(response -> {
            response.items().forEach(item -> acc.add(SCHEMA.mapToItem(item)));
            Map<String, AttributeValue> last = response.lastEvaluatedKey();
            if (last == null || last.isEmpty()) {
                return CompletableFuture.completedFuture(acc);
            }
            return drain(request.toBuilder().exclusiveStartKey(last).build(), acc);
        });
    }
}
