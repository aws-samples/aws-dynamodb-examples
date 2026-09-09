package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository;

import java.util.List;
import java.util.concurrent.CompletableFuture;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Repository;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.Notification;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.util.EnhancedQueryCollector;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbAsyncTable;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbEnhancedAsyncClient;
import software.amazon.awssdk.enhanced.dynamodb.Expression;
import software.amazon.awssdk.enhanced.dynamodb.Key;
import software.amazon.awssdk.enhanced.dynamodb.TableSchema;
import software.amazon.awssdk.enhanced.dynamodb.model.PutItemEnhancedRequest;
import software.amazon.awssdk.enhanced.dynamodb.model.QueryConditional;
import software.amazon.awssdk.enhanced.dynamodb.model.QueryEnhancedRequest;

/**
 * High-level {@link NotificationRepository} using {@link DynamoDbEnhancedAsyncClient}. Selected when
 * {@code dynamodb.client-type=high-level}.
 */
@Repository
@ConditionalOnProperty(name = "dynamodb.client-type", havingValue = "high-level")
public class HighLevelDynamoDbNotificationRepository implements NotificationRepository {

    private static final Logger logger = LoggerFactory.getLogger(HighLevelDynamoDbNotificationRepository.class);

private static final Expression NOTIFICATION_ABSENT = Expression.builder()
            .expression("attribute_not_exists(SK)")
            .build();

    private final DynamoDbAsyncTable<Notification> notificationTable;

    /**
     * @param enhancedClient enhanced async client
     * @param tableName      configured Notifications table name
     */
    public HighLevelDynamoDbNotificationRepository(
            DynamoDbEnhancedAsyncClient enhancedClient,
            @Value("${dynamodb.table-name.notifications}") String tableName) {
        this.notificationTable = enhancedClient.table(tableName, TableSchema.fromBean(Notification.class));
        logger.info("Initialized high-level Notification repository [tableName={}]", tableName);
    }

    /** {@inheritDoc} */
    @Override
    public CompletableFuture<Boolean> putNotificationIfAbsent(Notification notification) {
        return ConditionalWriteSupport.createdOrDuplicate(
                notificationTable.putItem(PutItemEnhancedRequest.builder(Notification.class)
                        .item(notification)
                        .conditionExpression(NOTIFICATION_ABSENT)
                        .build()));
    }

    /** {@inheritDoc} */
    @Override
    public CompletableFuture<List<Notification>> queryNotifications(String recipientUserId) {
        QueryConditional conditional = QueryConditional.keyEqualTo(Key.builder()
                .partitionValue(Notification.partitionKey(recipientUserId))
                .build());
        return EnhancedQueryCollector.collectAllItems(
                notificationTable.query(QueryEnhancedRequest.builder().queryConditional(conditional).build()));
    }
}
