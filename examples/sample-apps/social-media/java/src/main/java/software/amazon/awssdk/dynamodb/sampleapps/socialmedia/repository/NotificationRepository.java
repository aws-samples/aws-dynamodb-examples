package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository;

import java.util.List;
import java.util.concurrent.CompletableFuture;

import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.Notification;

/**
 * Persistence boundary for the Notifications table: idempotent stream-projected alerts.
 *
 * <p>Two implementations are selected at startup by {@code dynamodb.client-type}. Both keep DynamoDB
 * I/O async end-to-end.
 */
public interface NotificationRepository {

    /**
     * Writes one notification idempotently with a conditional {@code PutItem}
     * ({@code attribute_not_exists(SK)}), so duplicate stream delivery does not create duplicate rows.
     *
     * @param notification the notification row to write
     * @return future completing with {@code true} when the row was written, {@code false} when an
     *     identical notification already existed (condition failed)
     */
    CompletableFuture<Boolean> putNotificationIfAbsent(Notification notification);

    /**
     * Queries all notifications under a recipient's partition in sort-key order, draining pages.
     *
     * @param recipientUserId user whose notifications are read
     * @return the notifications, oldest-first, empty when none exist
     */
    CompletableFuture<List<Notification>> queryNotifications(String recipientUserId);
}
