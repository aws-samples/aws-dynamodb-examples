package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model;

import java.util.List;

import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.converter.MediaRefAttributeConverter;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbAttribute;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbBean;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbConvertedBy;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbPartitionKey;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbSortKey;

/**
 * A user's own profile-feed projection of a post in the Content table.
 *
 * <p>Key pattern: {@code PK=USER#{authorId}}, {@code SK=POST#{createdAt}#{postId}}. Newest-first "my
 * posts". For a {@code expiring content} it mirrors {@link PostMeta} and carries the same {@code expiresAt} TTL.
 * {@code likeCount} lives only on {@link PostMeta}, never here.
 */
@DynamoDbBean
public class UserPost {

public static final String PK_PREFIX = "USER#";

public static final String SK_PREFIX = "POST#";

public static final String ENTITY_TYPE = "USER_POST";

    private String pk;
    private String sk;
    private String entityType;
    private String postId;
    private String authorId;
    private String type;
    private String visibility;
    private List<String> allowedViewerUserIds;
    private String text;
    private String createdAt;
    private Long expiresAt;
    private List<MediaRef> media;

    /**
     * Builds the {@code SK} value for the given creation time and post id.
     *
     * @param createdAt ISO-8601 UTC creation timestamp
     * @param postId    unique post id
     * @return {@code POST#}{@code createdAt}{@code #}{@code postId}
     */
    public static String sortKey(String createdAt, String postId) {
        return SK_PREFIX + createdAt + "#" + postId;
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
