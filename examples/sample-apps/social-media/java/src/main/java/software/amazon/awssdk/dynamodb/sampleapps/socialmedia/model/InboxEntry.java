package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model;

import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.util.DynamoDbSchema;
import software.amazon.awssdk.enhanced.dynamodb.mapper.Order;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbAttribute;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbBean;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbPartitionKey;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbSecondaryPartitionKey;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbSecondarySortKey;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbSortKey;

/**
 * A per-user inbox projection in the Conversations table.
 *
 * <p>Key pattern: {@code PK=USER#{userId}}, {@code SK=INBOX#{conversationId}}. Upserted for every
 * participant on message send with the latest preview and activity time.
 *
 * <p>{@code GSI_INBOX}: partition {@code inboxUserId}, composite sort key {@code conversationType}
 * (first segment) then {@code lastActivityAt} (second segment), projection {@code INCLUDE} carrying
 * {@code conversationId}, {@code lastMessagePreview}, and {@code title}.
 */
@DynamoDbBean
public class InboxEntry {

public static final String GSI_INBOX = DynamoDbSchema.GSI_INBOX;

public static final String PK_PREFIX = "USER#";

public static final String SK_PREFIX = "INBOX#";

public static final String ENTITY_TYPE = "INBOX_ENTRY";

    private String pk;
    private String sk;
    private String entityType;
    private String inboxUserId;
    private String conversationType;
    private String lastActivityAt;
    private String conversationId;
    private String title;
    private String lastMessagePreview;
    private Long unreadCount;

    /**
     * Builds the {@code PK} value for the given participant user id.
     *
     * @param userId participant whose inbox holds the entry
     * @return {@code USER#}{@code userId}
     */
    public static String partitionKey(String userId) {
        return PK_PREFIX + userId;
    }

    /**
     * Builds the {@code SK} value for the given conversation id.
     *
     * @param conversationId owning conversation
     * @return {@code INBOX#}{@code conversationId}
     */
    public static String sortKey(String conversationId) {
        return SK_PREFIX + conversationId;
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

    @DynamoDbSecondaryPartitionKey(indexNames = GSI_INBOX)
    public String getInboxUserId() {
        return inboxUserId;
    }

    public void setInboxUserId(String inboxUserId) {
        this.inboxUserId = inboxUserId;
    }

    @DynamoDbSecondarySortKey(indexNames = GSI_INBOX, order = Order.FIRST)
    public String getConversationType() {
        return conversationType;
    }

    public void setConversationType(String conversationType) {
        this.conversationType = conversationType;
    }

    @DynamoDbSecondarySortKey(indexNames = GSI_INBOX, order = Order.SECOND)
    public String getLastActivityAt() {
        return lastActivityAt;
    }

    public void setLastActivityAt(String lastActivityAt) {
        this.lastActivityAt = lastActivityAt;
    }

    public String getConversationId() {
        return conversationId;
    }

    public void setConversationId(String conversationId) {
        this.conversationId = conversationId;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getLastMessagePreview() {
        return lastMessagePreview;
    }

    public void setLastMessagePreview(String lastMessagePreview) {
        this.lastMessagePreview = lastMessagePreview;
    }

    public Long getUnreadCount() {
        return unreadCount;
    }

    public void setUnreadCount(Long unreadCount) {
        this.unreadCount = unreadCount;
    }
}
