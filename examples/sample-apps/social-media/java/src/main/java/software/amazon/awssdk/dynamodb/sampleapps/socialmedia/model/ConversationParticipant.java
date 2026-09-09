package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model;

import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbAttribute;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbBean;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbPartitionKey;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbSortKey;

/**
 * A conversation member row in the Conversations table.
 *
 * <p>Key pattern: {@code PK=CONVERSATION#{conversationId}}, {@code SK=PARTICIPANT#{userId}}. Defines
 * who may send in the room and who is notified on a new message. Resolved by a
 * {@code begins_with(SK, PARTICIPANT#)} query for inbox fan-out, the snapshot fallback
 * path, and message notification projection.
 */
@DynamoDbBean
public class ConversationParticipant {

public static final String PK_PREFIX = "CONVERSATION#";

public static final String SK_PREFIX = "PARTICIPANT#";

public static final String ENTITY_TYPE = "CONVERSATION_PARTICIPANT";

    private String pk;
    private String sk;
    private String entityType;
    private String userId;
    private String joinedAt;

    /**
     * Builds the {@code SK} value for the given member id.
     *
     * @param userId conversation member
     * @return {@code PARTICIPANT#}{@code userId}
     */
    public static String sortKey(String userId) {
        return SK_PREFIX + userId;
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

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getJoinedAt() {
        return joinedAt;
    }

    public void setJoinedAt(String joinedAt) {
        this.joinedAt = joinedAt;
    }
}
