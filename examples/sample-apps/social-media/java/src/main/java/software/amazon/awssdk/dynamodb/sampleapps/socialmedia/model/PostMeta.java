package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model;

import java.util.List;

import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.converter.MediaRefAttributeConverter;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbAttribute;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbBean;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbConvertedBy;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbPartitionKey;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbSortKey;

/**
 * The source-of-truth post row in the Content table.
 *
 * <p>Key pattern: {@code PK=POST#{postId}}, {@code SK=META}. Holds content, visibility, and the
 * running {@code likeCount}. The {@code POST_META} insert triggers  notifications and
 * fan-out. For a {@code expiring content} it carries a numeric {@code expiresAt} TTL. The {@code media} list is
 * persisted with {@link MediaRefAttributeConverter} so the stored shape is a native list of maps for
 * both client types.
 */
@DynamoDbBean
public class PostMeta {

public static final String PK_PREFIX = "POST#";

public static final String SORT_KEY = "META";

public static final String ENTITY_TYPE = "POST_META";

    private String pk;
    private String sk;
    private String entityType;
    private String postId;
    private String authorId;
    private String requestFingerprint;
    private String type;
    private String visibility;
    private List<String> allowedViewerUserIds;
    private String text;
    private String createdAt;
    private Long likeCount;
    private Long expiresAt;
    private List<MediaRef> media;

    /**
     * Builds the {@code PK} value for the given post id.
     *
     * @param postId unique post id
     * @return {@code POST#}{@code postId}
     */
    public static String partitionKey(String postId) {
        return PK_PREFIX + postId;
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

    public String getAuthorId() {
        return authorId;
    }

    public void setAuthorId(String authorId) {
        this.authorId = authorId;
    }

    public String getRequestFingerprint() {
        return requestFingerprint;
    }

    public void setRequestFingerprint(String requestFingerprint) {
        this.requestFingerprint = requestFingerprint;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getVisibility() {
        return visibility;
    }

    public void setVisibility(String visibility) {
        this.visibility = visibility;
    }

    public List<String> getAllowedViewerUserIds() {
        return allowedViewerUserIds;
    }

    public void setAllowedViewerUserIds(List<String> allowedViewerUserIds) {
        this.allowedViewerUserIds = allowedViewerUserIds;
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

    public Long getLikeCount() {
        return likeCount;
    }

    public void setLikeCount(Long likeCount) {
        this.likeCount = likeCount;
    }

    public Long getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(Long expiresAt) {
        this.expiresAt = expiresAt;
    }

    @DynamoDbConvertedBy(MediaRefAttributeConverter.class)
    public List<MediaRef> getMedia() {
        return media;
    }

    public void setMedia(List<MediaRef> media) {
        this.media = media;
    }
}
