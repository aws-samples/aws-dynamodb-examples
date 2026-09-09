package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model;

import java.util.List;

import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.converter.MediaRefAttributeConverter;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.util.DynamoDbSchema;
import software.amazon.awssdk.enhanced.dynamodb.mapper.Order;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbAttribute;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbBean;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbConvertedBy;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbPartitionKey;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbSecondaryPartitionKey;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbSecondarySortKey;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbSortKey;

/**
 * A pre-built home-feed copy in the Timelines table.
 *
 * <p>Key pattern: {@code PK=TIMELINE#{recipientUserId}}, {@code SK=TIMESTAMP#{createdAt}#POST#{postId}}.
 * Built at publish time so an  read is one fast {@code Query} on {@code GSI_TIMELINE}.
 *
 * <p>{@code GSI_TIMELINE}: partition {@code timelineUserId}, composite sort key
 * {@code timelineCreatedAt} (first segment) then {@code timelinePostId} (second segment), projection
 * {@code ALL}. Carries denormalized {@code visibility} and {@code media} so a timeline read renders
 * without a base-table follow-up.
 */
@DynamoDbBean
public class TimelineEntry {

public static final String GSI_TIMELINE = DynamoDbSchema.GSI_TIMELINE;

public static final String PK_PREFIX = "TIMELINE#";

public static final String SK_TIMESTAMP_PREFIX = "TIMESTAMP#";

public static final String SK_POST_PREFIX = "POST#";

public static final String ENTITY_TYPE = "TIMELINE_ENTRY";

    private String pk;
    private String sk;
    private String entityType;
    private String timelineUserId;
    private String timelineCreatedAt;
    private String timelinePostId;
    private String postId;
    private String authorId;
    private String text;
    private String createdAt;
    private String visibility;
    private List<MediaRef> media;

    /**
     * Builds the {@code PK} value for the given recipient user id.
     *
     * @param recipientUserId user whose home feed receives the copy
     * @return {@code TIMELINE#}{@code recipientUserId}
     */
    public static String partitionKey(String recipientUserId) {
        return PK_PREFIX + recipientUserId;
    }

    /**
     * Builds the {@code SK} value for the given creation time and post id.
     *
     * @param createdAt ISO-8601 UTC creation timestamp
     * @param postId    source post id
     * @return {@code TIMESTAMP#}{@code createdAt}{@code #POST#}{@code postId}
     */
    public static String sortKey(String createdAt, String postId) {
        return SK_TIMESTAMP_PREFIX + createdAt + "#" + SK_POST_PREFIX + postId;
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

    @DynamoDbSecondaryPartitionKey(indexNames = GSI_TIMELINE)
    public String getTimelineUserId() {
        return timelineUserId;
    }

    public void setTimelineUserId(String timelineUserId) {
        this.timelineUserId = timelineUserId;
    }

    @DynamoDbSecondarySortKey(indexNames = GSI_TIMELINE, order = Order.FIRST)
    public String getTimelineCreatedAt() {
        return timelineCreatedAt;
    }

    public void setTimelineCreatedAt(String timelineCreatedAt) {
        this.timelineCreatedAt = timelineCreatedAt;
    }

    @DynamoDbSecondarySortKey(indexNames = GSI_TIMELINE, order = Order.SECOND)
    public String getTimelinePostId() {
        return timelinePostId;
    }

    public void setTimelinePostId(String timelinePostId) {
        this.timelinePostId = timelinePostId;
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

    public String getVisibility() {
        return visibility;
    }

    public void setVisibility(String visibility) {
        this.visibility = visibility;
    }

    @DynamoDbConvertedBy(MediaRefAttributeConverter.class)
    public List<MediaRef> getMedia() {
        return media;
    }

    public void setMedia(List<MediaRef> media) {
        this.media = media;
    }
}
