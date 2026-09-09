package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model;

import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbAttribute;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbBean;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbPartitionKey;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbSortKey;

/**
 * One append-only line of conversation history in the Messages table.
 *
 * <p>Key pattern: {@code PK=CONVERSATION#{conversationId}}, {@code SK=MESSAGE#{createdAt}#{messageId}}.
 * Appended on each send. The {@code MESSAGE} insert drives notification
 * projection. The log is rarely re-read, matching the Messages table Standard-IA storage class.
 */
@DynamoDbBean
public class Message {

public static final String PK_PREFIX = "CONVERSATION#";

public static final String SK_PREFIX = "MESSAGE#";

public static final String ENTITY_TYPE = "MESSAGE";

    private String pk;
    private String sk;
    private String entityType;
    private String messageId;
    private String conversationId;
    private String senderId;
    private String text;
    private String createdAt;

    /**
     * Builds the {@code PK} value for the given conversation id.
     *
     * @param conversationId owning conversation
     * @return {@code CONVERSATION#}{@code conversationId}
     */
    public static String partitionKey(String conversationId) {
        return PK_PREFIX + conversationId;
    }

    /**
     * Builds the {@code SK} value for the given creation time and message id.
     *
     * @param createdAt ISO-8601 UTC creation timestamp
     * @param messageId unique message id
     * @return {@code MESSAGE#}{@code createdAt}{@code #}{@code messageId}
     */
    public static String sortKey(String createdAt, String messageId) {
        return SK_PREFIX + createdAt + "#" + messageId;
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

    public String getMessageId() {
        return messageId;
    }

    public void setMessageId(String messageId) {
        this.messageId = messageId;
    }

    public String getConversationId() {
        return conversationId;
    }

    public void setConversationId(String conversationId) {
        this.conversationId = conversationId;
    }

    public String getSenderId() {
        return senderId;
    }

    public void setSenderId(String senderId) {
        this.senderId = senderId;
    }

    public String getText() {
        return text;
    }

    public void setText(String text) {
        this.text = text;
    }

    public String getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }
}
