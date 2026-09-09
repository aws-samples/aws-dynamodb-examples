package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model;

import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbAttribute;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbBean;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbPartitionKey;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbSortKey;

/**
 * Conversation-room metadata in the Conversations table.
 *
 * <p>Key pattern: {@code PK=CONVERSATION#{conversationId}}, {@code SK=META}. Holds the room name,
 * whether it is a direct message or group, and the authoritative {@code participantCount} used to
 * detect an incomplete chunked create. Written with {@code attribute_not_exists(PK)}.
 */
@DynamoDbBean
public class ConversationMeta {

public static final String PK_PREFIX = "CONVERSATION#";

public static final String SORT_KEY = "META";

public static final String ENTITY_TYPE = "CONVERSATION_META";

public static final String LIFECYCLE_CREATING = "CREATING";

public static final String LIFECYCLE_ACTIVE = "ACTIVE";

    private String pk;
    private String sk;
    private String entityType;
    private String conversationId;
    private String type;
    private String title;
    private Long participantCount;
    private String createdAt;
    private String requestFingerprint;
    private String lifecycleState;

    /**
     * Builds the {@code PK} value for the given conversation id.
     *
     * @param conversationId unique conversation id
     * @return {@code CONVERSATION#}{@code conversationId}
     */
    public static String partitionKey(String conversationId) {
        return PK_PREFIX + conversationId;
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

    public String getConversationId() {
        return conversationId;
    }

    public void setConversationId(String conversationId) {
        this.conversationId = conversationId;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public Long getParticipantCount() {
        return participantCount;
    }

    public void setParticipantCount(Long participantCount) {
        this.participantCount = participantCount;
    }

    public String getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }

    public String getRequestFingerprint() {
        return requestFingerprint;
    }

    public void setRequestFingerprint(String requestFingerprint) {
        this.requestFingerprint = requestFingerprint;
    }

    public String getLifecycleState() {
        return lifecycleState;
    }

    public void setLifecycleState(String lifecycleState) {
        this.lifecycleState = lifecycleState;
    }

}
