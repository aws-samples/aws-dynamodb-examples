package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model;

import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbAttribute;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbBean;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbPartitionKey;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbSortKey;

/**
 * An at-most-once like edge in the Content table.
 *
 * <p>Key pattern: {@code PK=POST#{postId}}, {@code SK=LIKE#{userId}}. Written with
 * {@code attribute_not_exists(SK)} inside the  {@code TransactWriteItems} that also increments
 * {@link PostMeta#getLikeCount()}, so a person can like a post only once even under retries.
 */
@DynamoDbBean
public class Like {

public static final String PK_PREFIX = "POST#";

public static final String SK_PREFIX = "LIKE#";

public static final String ENTITY_TYPE = "LIKE";

    private String pk;
    private String sk;
    private String entityType;
    private String postId;
    private String userId;
    private String createdAt;

    /**
     * Builds the {@code SK} value for the given liker id.
     *
     * @param userId user who liked the post
     * @return {@code LIKE#}{@code userId}
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

    public String getPostId() {
        return postId;
    }

    public void setPostId(String postId) {
        this.postId = postId;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }
}
