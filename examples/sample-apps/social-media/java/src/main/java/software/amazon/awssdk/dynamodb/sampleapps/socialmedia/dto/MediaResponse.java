package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * One media attachment in a post response, carrying a time-limited presigned download URL instead of
 * the raw bucket and key.
 *
 * <p>Optional geometry fields ({@code width}, {@code height}, {@code durationSeconds},
 * {@code sizeBytes}) are omitted when absent.
 *
 * @param mediaId         stable media id
 * @param kind            {@code IMAGE} or {@code VIDEO}
 * @param contentType     MIME type
 * @param url             presigned {@code GET} download URL, valid for {@code media.presign-ttl-seconds}
 * @param sizeBytes       object size in bytes, or {@code null} when unknown
 * @param width           image or video width in pixels, or {@code null} when not applicable
 * @param height          image or video height in pixels, or {@code null} when not applicable
 * @param durationSeconds video duration in seconds, or {@code null} for images
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record MediaResponse(
        String mediaId,
        String kind,
        String contentType,
        String url,
        Long sizeBytes,
        Integer width,
        Integer height,
        Integer durationSeconds) {
}
