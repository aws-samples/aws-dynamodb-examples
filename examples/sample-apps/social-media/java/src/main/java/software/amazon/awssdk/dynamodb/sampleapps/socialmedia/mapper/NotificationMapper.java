package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.mapper;

import java.time.Instant;

import org.springframework.stereotype.Component;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.Message;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.Notification;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.PostMeta;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.SourceType;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.stream.StreamProcessingConstants;

/**
 * Builds the {@code NOTIFICATION} rows the stream consumer projects.
 *
 * <p>The row key is derived deterministically from the source event so the conditional write
 * ({@code attribute_not_exists(SK)}) makes duplicate stream delivery a no-op. The recipient is the
 * partition, the source {@code createdAt} is the first sort-key segment, and the source id is used as
 * the {@code notificationId} so re-processing the same insert for the same recipient always targets
 * the same key. The optional {@code expiresAt} TTL is {@code createdAt} plus
 * {@link StreamProcessingConstants#NOTIFICATION_TTL_SECONDS}.
 */
@Component
public class NotificationMapper {

    /**
     * Builds a post notification for one recipient from a {@code POST_META} insert.
     *
     * @param recipientUserId the follower or allow-list viewer to alert (never the author)
     * @param meta            the source post row
     * @return the deterministic, idempotent notification row
     */
    public Notification forPost(String recipientUserId, PostMeta meta) {
        return build(recipientUserId, SourceType.POST, meta.getPostId(), meta.getCreatedAt());
    }

    /**
     * Builds a message notification for one recipient from a {@code MESSAGE} insert.
     *
     * @param recipientUserId a conversation participant other than the sender
     * @param message         the source message row
     * @return the deterministic, idempotent notification row
     */
    public Notification forMessage(String recipientUserId, Message message) {
        return build(recipientUserId, SourceType.MESSAGE, message.getMessageId(), message.getCreatedAt());
    }

    /** Assembles a notification with a deterministic key and optional TTL. */
    private Notification build(String recipientUserId, SourceType sourceType, String sourceId, String createdAt) {
        Notification notification = new Notification();
        notification.setPk(Notification.partitionKey(recipientUserId));
        notification.setSk(Notification.sortKey(createdAt, sourceId));
        notification.setEntityType(Notification.ENTITY_TYPE);
        notification.setNotificationId(sourceId);
        notification.setRecipientUserId(recipientUserId);
        notification.setSourceType(sourceType.name());
        notification.setSourceId(sourceId);
        notification.setCreatedAt(createdAt);
        notification.setExpiresAt(Instant.parse(createdAt).getEpochSecond()
                + StreamProcessingConstants.NOTIFICATION_TTL_SECONDS);
        return notification;
    }
}
