package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model;

import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbAttribute;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbBean;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbPartitionKey;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbSortKey;

/**
 * A stream-projected alert in the Notifications table.
 *
 * <p>Key pattern: {@code PK=USER#{recipientUserId}}, {@code SK=NOTIFICATION#{createdAt}#{notificationId}}.
 * Written idempotently with {@code attribute_not_exists(SK)} by the  stream consumer so
 * duplicate delivery is safe. Optional {@code expiresAt} TTL (seven days by default).
 */
@DynamoDbBean
public class Notification {

public static final String PK_PREFIX = "USER#";

public static final String SK_PREFIX = "NOTIFICATION#";

public static final String ENTITY_TYPE = "NOTIFICATION";

    private String pk;
    private String sk;
    private String entityType;
    private String notificationId;
    private String recipientUserId;
    private String sourceType;
    private String sourceId;
    private String createdAt;
    private Long expiresAt;

    /**
     * Builds the {@code PK} value for the given recipient user id.
     *
     * @param recipientUserId user who receives the alert
     * @return {@code USER#}{@code recipientUserId}
     */
    public static String partitionKey(String recipientUserId) {
        return PK_PREFIX + recipientUserId;
    }

    /**
     * Builds the {@code SK} value for the given creation time and notification id.
     *
     * @param createdAt      ISO-8601 UTC creation timestamp
     * @param notificationId unique notification id
     * @return {@code NOTIFICATION#}{@code createdAt}{@code #}{@code notificationId}
     */
    public static String sortKey(String createdAt, String notificationId) {
        return SK_PREFIX + createdAt + "#" + notificationId;
    }

    @DynamoDbPartitionKey
    @DynamoDbAttribute("PK")
    public String getPk() {
        return pk;
    }

    public void setPk(String pk) {
        this.pk = pk;
    }

    @DynamoDbSortKey
    @DynamoDbAttribute("SK")
    public String getSk() {
        return sk;
    }

    public void setSk(String sk) {
        this.sk = sk;
    }

    public String getEntityType() {
        return entityType;
    }

    public void setEntityType(String entityType) {
        this.entityType = entityType;
    }

    public String getNotificationId() {
        return notificationId;
    }

    public void setNotificationId(String notificationId) {
        this.notificationId = notificationId;
    }

    public String getRecipientUserId() {
        return recipientUserId;
    }

    public void setRecipientUserId(String recipientUserId) {
        this.recipientUserId = recipientUserId;
    }

    public String getSourceType() {
        return sourceType;
    }

    public void setSourceType(String sourceType) {
        this.sourceType = sourceType;
    }

    public String getSourceId() {
        return sourceId;
    }

    public void setSourceId(String sourceId) {
        this.sourceId = sourceId;
    }

    public String getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }

    public Long getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(Long expiresAt) {
        this.expiresAt = expiresAt;
    }
}
