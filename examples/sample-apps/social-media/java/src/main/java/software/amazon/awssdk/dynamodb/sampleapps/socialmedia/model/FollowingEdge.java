package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model;

import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbAttribute;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbBean;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbPartitionKey;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbSortKey;

/**
 * The caller's "following" edge in the UserGraph table.
 *
 * <p>Key pattern: {@code PK=USER#{followerId}}, {@code SK=FOLLOWING#{followeeId}}. Written atomically
 * with the matching {@link FollowerEdge} in one {@code TransactWriteItems} so the graph stays
 * consistent.
 */
@DynamoDbBean
public class FollowingEdge {

public static final String PK_PREFIX = "USER#";

public static final String SK_PREFIX = "FOLLOWING#";

public static final String ENTITY_TYPE = "FOLLOWING_EDGE";

    private String pk;
    private String sk;
    private String entityType;
    private String followerId;
    private String followeeId;
    private String createdAt;

    /**
     * Builds the {@code SK} value for the given followee id.
     *
     * @param followeeId user being followed
     * @return {@code FOLLOWING#}{@code followeeId}
     */
    public static String sortKey(String followeeId) {
        return SK_PREFIX + followeeId;
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

    public String getFollowerId() {
        return followerId;
    }

    public void setFollowerId(String followerId) {
        this.followerId = followerId;
    }

    public String getFolloweeId() {
        return followeeId;
    }

    public void setFolloweeId(String followeeId) {
        this.followeeId = followeeId;
    }

    public String getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }
}
