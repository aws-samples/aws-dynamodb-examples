package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model;

import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbAttribute;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbBean;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbPartitionKey;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbSortKey;

/**
 * A user account row in the UserGraph table.
 *
 * <p>Key pattern: {@code PK=USER#{userId}}, {@code SK=PROFILE}. This is the root entity: every other
 * feature attaches to it. The service creates it with a conditional {@code PutItem}
 * ({@code attribute_not_exists(PK)}) so a retry with the same {@code userId} replays the stored
 * profile. A changed {@code displayName} is not treated as a different owner.
 *
 * <p>Mapped with the enhanced-client bean annotations. The same bean is reused by the low-level
 * repository through {@code TableSchema.fromBean} for attribute-map conversion, so the two client
 * types persist an identical item shape.
 */
@DynamoDbBean
public class UserProfile {

public static final String PK_PREFIX = "USER#";

public static final String SORT_KEY = "PROFILE";

public static final String ENTITY_TYPE = "USER_PROFILE";

    private String pk;
    private String sk;
    private String entityType;
    private String userId;
    private String displayName;
    private String createdAt;
    private String updatedAt;
    private Long version;

    /**
     * Builds a {@code PK} value for the given user id.
     *
     * @param userId natural user id
     * @return {@code USER#}{@code userId}
     */
    public static String partitionKey(String userId) {
        return PK_PREFIX + userId;
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

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    public String getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }

    public String getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(String updatedAt) {
        this.updatedAt = updatedAt;
    }

    public Long getVersion() {
        return version;
    }

    public void setVersion(Long version) {
        this.version = version;
    }
}
