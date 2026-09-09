package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.mapper;

import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Component;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto.MediaResponse;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto.PublishPostResponse;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.MediaRef;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.PostMeta;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.PostType;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.TimelineEntry;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.UserPost;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.Visibility;

/**
 * Builds the content rows and response shape.
 *
 * <p>The {@code POST_META} source-of-truth row and the author's {@code USER_POST} projection carry an
 * identical view of the post (visibility, optional allow list, optional media). A
 * {@code TIMELINE_ENTRY} denormalizes the summary (including media and visibility, but not the allow
 * list) so a read renders without a base-table follow-up.
 */
@Component
public class PostMapper {

    /**
     * Builds the {@code POST_META} source-of-truth row.
     *
     * @param postId               unique post id
     * @param authorId             the author (the {@code X-User-Id} caller)
     * @param type                 {@code POST} or {@code expiring content}
     * @param visibility           post visibility
     * @param allowedViewerUserIds allow list, present only when {@code RESTRICTED}
     * @param text                 optional post text
     * @param createdAt            ISO-8601 UTC creation instant
     * @param expiresAt            numeric Unix-seconds TTL for a {@code expiring content}, or {@code null} for a {@code POST}
     * @param media                media references, empty when none
     * @return the {@code POST_META} row keyed by {@code POST#{postId}} / {@code META}
     */
    public PostMeta toPostMeta(String postId, String authorId, String type, Visibility visibility,
                               List<String> allowedViewerUserIds, String text, String createdAt,
                               Long expiresAt, List<MediaRef> media) {
        PostMeta meta = new PostMeta();
        meta.setPk(PostMeta.partitionKey(postId));
        meta.setSk(PostMeta.SORT_KEY);
        meta.setEntityType(PostMeta.ENTITY_TYPE);
        meta.setPostId(postId);
        meta.setAuthorId(authorId);
        meta.setType(type);
        meta.setVisibility(visibility.name());
        meta.setAllowedViewerUserIds(allowList(visibility, allowedViewerUserIds));
        meta.setText(text);
        meta.setCreatedAt(createdAt);
        meta.setLikeCount(isStory(type) ? null : 0L);
        meta.setExpiresAt(expiresAt);
        meta.setMedia(media.isEmpty() ? null : media);
        return meta;
    }

    /**
     * Builds the author's {@code USER_POST} profile-feed projection of the same post.
     *
     * @param meta the {@code POST_META} row already built
     * @return the {@code USER_POST} row keyed by {@code USER#{authorId}} / {@code POST#{createdAt}#{postId}}
     */
    public UserPost toUserPost(PostMeta meta) {
        UserPost userPost = new UserPost();
        userPost.setPk(UserPost.PK_PREFIX + meta.getAuthorId());
        userPost.setSk(UserPost.sortKey(meta.getCreatedAt(), meta.getPostId()));
        userPost.setEntityType(UserPost.ENTITY_TYPE);
        userPost.setPostId(meta.getPostId());
        userPost.setAuthorId(meta.getAuthorId());
        userPost.setType(meta.getType());
        userPost.setVisibility(meta.getVisibility());
        userPost.setAllowedViewerUserIds(meta.getAllowedViewerUserIds());
        userPost.setText(meta.getText());
        userPost.setCreatedAt(meta.getCreatedAt());
        userPost.setExpiresAt(meta.getExpiresAt());
        userPost.setMedia(meta.getMedia());
        return userPost;
    }

    /**
     * Builds a denormalized {@code TIMELINE_ENTRY} fan-out copy for one recipient.
     *
     * @param recipientUserId user whose home feed receives the copy
     * @param meta            the source {@code POST_META} row
     * @return the timeline entry keyed by {@code TIMELINE#{recipientUserId}} /
     *     {@code TIMESTAMP#{createdAt}#POST#{postId}}
     */
    public TimelineEntry toTimelineEntry(String recipientUserId, PostMeta meta) {
        TimelineEntry entry = new TimelineEntry();
        entry.setPk(TimelineEntry.partitionKey(recipientUserId));
        entry.setSk(TimelineEntry.sortKey(meta.getCreatedAt(), meta.getPostId()));
        entry.setEntityType(TimelineEntry.ENTITY_TYPE);
        entry.setTimelineUserId(recipientUserId);
        entry.setTimelineCreatedAt(meta.getCreatedAt());
        entry.setTimelinePostId(meta.getPostId());
        entry.setPostId(meta.getPostId());
        entry.setAuthorId(meta.getAuthorId());
        entry.setText(meta.getText());
        entry.setCreatedAt(meta.getCreatedAt());
        entry.setVisibility(meta.getVisibility());
        entry.setMedia(meta.getMedia());
        return entry;
    }

    /**
     * Maps a stored post plus its enriched media to the API response shape.
     *
     * @param meta  the {@code POST_META} row
     * @param media media responses carrying presigned download URLs, empty when none
     * @return the publish response
     */
    public PublishPostResponse toResponse(PostMeta meta, List<MediaResponse> media) {
        return new PublishPostResponse(
                meta.getPostId(),
                meta.getAuthorId(),
                meta.getType(),
                meta.getVisibility(),
                meta.getAllowedViewerUserIds(),
                meta.getText(),
                meta.getCreatedAt(),
                meta.getExpiresAt(),
                meta.getLikeCount(),
                media.isEmpty() ? null : media);
    }

    /**
     * Maps one stored media reference to a response element carrying a presigned download URL.
     *
     * @param ref the stored media reference
     * @param url the presigned {@code GET} URL
     * @return the response element
     */
    public MediaResponse toMediaResponse(MediaRef ref, String url) {
        return new MediaResponse(
                ref.mediaId(),
                ref.kind(),
                ref.contentType(),
                url,
                ref.sizeBytes(),
                ref.width(),
                ref.height(),
                ref.durationSeconds());
    }

    /** Returns the allow list only for a {@code RESTRICTED} post, otherwise {@code null}. */
    private List<String> allowList(Visibility visibility, List<String> allowedViewerUserIds) {
        if (visibility != Visibility.RESTRICTED || allowedViewerUserIds == null) {
            return null;
        }
        return new ArrayList<>(allowedViewerUserIds);
    }

    private boolean isStory(String type) {
        return PostType.STORY.name().equals(type);
    }
}
