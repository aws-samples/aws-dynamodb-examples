package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * The post summary inside a post-context snapshot.
 *
 * <p>Bundles the post fields a viewer sees when opening a post. {@code allowedViewerUserIds} is
 * present only when {@code visibility=RESTRICTED}, {@code text} is omitted for a media-only post, and
 * {@code media} is omitted when the post has no attachments. Media elements carry a presigned
 * {@code GET} download URL.
 *
 * @param postId               unique post id
 * @param authorId             the author id
 * @param text                 post text, omitted for a media-only post
 * @param createdAt            creation instant as an ISO-8601 UTC string
 * @param likeCount            running like total
 * @param type                 {@code POST} or {@code expiring content}
 * @param visibility           {@code PUBLIC}, {@code PRIVATE}, or {@code RESTRICTED}
 * @param allowedViewerUserIds present only when {@code RESTRICTED}
 * @param media                attachments with presigned download URLs, omitted when none
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record PostSummaryResponse(
        String postId,
        String authorId,
        String text,
        String createdAt,
        long likeCount,
        String type,
        String visibility,
        List<String> allowedViewerUserIds,
        List<MediaResponse> media) {
}
