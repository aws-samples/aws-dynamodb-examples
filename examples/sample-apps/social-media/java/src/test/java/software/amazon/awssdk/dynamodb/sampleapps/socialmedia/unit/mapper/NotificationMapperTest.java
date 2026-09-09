package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.unit.mapper;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.mapper.NotificationMapper;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.Message;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.Notification;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.PostMeta;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.SourceType;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.stream.StreamProcessingConstants;

/**
 * Unit coverage for the deterministic notification row mapping. No
 * Docker or Spring context is required. The key must be derived only from the source event so a
 * repeated projection targets the same row and the conditional write stays idempotent.
 */
@Tag("unit")
class NotificationMapperTest {

    private static final String CREATED_AT = "2026-05-27T10:00:00Z";

    private final NotificationMapper mapper = new NotificationMapper();

    @Test
    void postNotificationDerivesDeterministicKeyAndTtl() {
        PostMeta meta = postMeta("post_123", "user_author", CREATED_AT);

        Notification notification = mapper.forPost("user_reader", meta);

        assertThat(notification.getPk()).isEqualTo("USER#user_reader");
        assertThat(notification.getSk()).isEqualTo("NOTIFICATION#" + CREATED_AT + "#post_123");
        assertThat(notification.getEntityType()).isEqualTo(Notification.ENTITY_TYPE);
        assertThat(notification.getNotificationId()).isEqualTo("post_123");
        assertThat(notification.getRecipientUserId()).isEqualTo("user_reader");
        assertThat(notification.getSourceType()).isEqualTo(SourceType.POST.name());
        assertThat(notification.getSourceId()).isEqualTo("post_123");
        assertThat(notification.getCreatedAt()).isEqualTo(CREATED_AT);
        assertThat(notification.getExpiresAt()).isEqualTo(
                Instant.parse(CREATED_AT).getEpochSecond() + StreamProcessingConstants.NOTIFICATION_TTL_SECONDS);
    }

    @Test
    void postNotificationIsStableAcrossRepeatedMapping() {
        PostMeta meta = postMeta("post_123", "user_author", CREATED_AT);

        Notification first = mapper.forPost("user_reader", meta);
        Notification second = mapper.forPost("user_reader", meta);

        assertThat(first.getSk()).isEqualTo(second.getSk());
        assertThat(first.getPk()).isEqualTo(second.getPk());
    }

    @Test
    void messageNotificationDerivesDeterministicKey() {
        Message message = message("msg_9", "conv_1", "user_sender", CREATED_AT);

        Notification notification = mapper.forMessage("user_member", message);

        assertThat(notification.getPk()).isEqualTo("USER#user_member");
        assertThat(notification.getSk()).isEqualTo("NOTIFICATION#" + CREATED_AT + "#msg_9");
        assertThat(notification.getNotificationId()).isEqualTo("msg_9");
        assertThat(notification.getSourceType()).isEqualTo(SourceType.MESSAGE.name());
        assertThat(notification.getSourceId()).isEqualTo("msg_9");
    }

    private static PostMeta postMeta(String postId, String authorId, String createdAt) {
        PostMeta meta = new PostMeta();
        meta.setPostId(postId);
        meta.setAuthorId(authorId);
        meta.setCreatedAt(createdAt);
        return meta;
    }

    private static Message message(String messageId, String conversationId, String senderId, String createdAt) {
        Message message = new Message();
        message.setMessageId(messageId);
        message.setConversationId(conversationId);
        message.setSenderId(senderId);
        message.setCreatedAt(createdAt);
        return message;
    }
}
