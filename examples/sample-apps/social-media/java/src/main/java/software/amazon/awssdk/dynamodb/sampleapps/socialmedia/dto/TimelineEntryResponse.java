package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * One entry in a home-timeline page.
 *
 * <p>Rendered directly from the denormalized {@code TIMELINE_ENTRY} fan-out copy, so a timeline read
 * needs no base-table follow-up. {@code text} is omitted for a media-only post and {@code media} is
 * omitted when the post carries no attachments. Each media element exposes a time-limited presigned
 * download URL instead of the raw bucket and key.
 *
 * @param postId    source post id
 * @param authorId  post author id
 * @param text      post text, omitted for a media-only post
 * @param createdAt ISO-8601 UTC creation instant
 * @param media     media attachments with presigned download URLs, omitted when none
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record TimelineEntryResponse(
        String postId,
        String authorId,
        String text,
        String createdAt,
        List<MediaResponse> media) {
}
