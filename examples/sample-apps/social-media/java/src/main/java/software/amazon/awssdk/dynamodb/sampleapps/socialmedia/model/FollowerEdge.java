package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model;

import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbAttribute;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbBean;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbPartitionKey;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbSortKey;

/**
 * A creator's "follower" edge in the UserGraph table.
 *
 * <p>Key pattern: {@code PK=USER#{followeeId}}, {@code SK=FOLLOWER#{followerId}}. Names exactly who a
 * new public post must reach. Written in the same {@code TransactWriteItems} as the matching
 * {@link FollowingEdge} in one {@code TransactWriteItems}. Resolved by a {@code begins_with(SK, FOLLOWER#)} query at publish
 * fan-out and notification projection.
 */
@DynamoDbBean
public class FollowerEdge {

public static final String PK_PREFIX = "USER#";

public static final String SK_PREFIX = "FOLLOWER#";

public static final String ENTITY_TYPE = "FOLLOWER_EDGE";

    private String pk;
    private String sk;
    private String entityType;
    private String followerId;
    private String followeeId;
    private String createdAt;

    /**
     * Builds the {@code SK} value for the given follower id.
     *
     * @param followerId user who follows
     * @return {@code FOLLOWER#}{@code followerId}
     */
    public static String sortKey(String followerId) {
        return SK_PREFIX + followerId;
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
