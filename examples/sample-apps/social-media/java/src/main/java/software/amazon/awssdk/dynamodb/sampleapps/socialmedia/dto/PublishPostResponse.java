package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * Response body for {@code POST /api/v1/posts}.
 *
 * <p>Returned with HTTP {@code 201}. {@code media} is omitted when the post has no attachments and
 * {@code allowedViewerUserIds} is present only when {@code visibility=RESTRICTED}. {@code text} is
 * omitted for a media-only post. {@code expiresAt} is a numeric Unix-seconds TTL present only for a
 * {@code expiring content}, and {@code likeCount} is present only for a durable {@code POST}.
 *
 * @param postId               unique post id
 * @param authorId             the {@code X-User-Id} author
 * @param type                 {@code POST} or {@code expiring content}
 * @param visibility           {@code PUBLIC}, {@code PRIVATE}, or {@code RESTRICTED}
 * @param allowedViewerUserIds present only when {@code RESTRICTED}
 * @param text                 post text, omitted for a media-only post
 * @param createdAt            creation instant as an ISO-8601 UTC string
 * @param expiresAt            numeric Unix-seconds TTL, present only for a {@code expiring content}
 * @param likeCount            running like total, present only for a {@code POST}
 * @param media                attachments with presigned download URLs, omitted when none
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record PublishPostResponse(
        String postId,
        String authorId,
        String type,
        String visibility,
        List<String> allowedViewerUserIds,
        String text,
        String createdAt,
        Long expiresAt,
        Long likeCount,
        List<MediaResponse> media) {
}
