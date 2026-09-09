package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * One media attachment reference in a {@link PublishPostRequest}.
 *
 * <p>The bytes are uploaded first through {@code POST /api/v1/media} (the two-phase presigned flow),
 * so a post references already-staged media by its stable {@code mediaId}. The service validates each
 * attachment (S3 object exists, {@code kind}/{@code contentType} within limits) before persisting.
 *
 * @param mediaId     stable media id returned by {@code POST /api/v1/media}
 * @param kind        {@code IMAGE} or {@code VIDEO}, must agree with {@code contentType}
 * @param contentType MIME type, for example {@code image/jpeg} or {@code video/mp4}
 */
public record MediaAttachmentRequest(
        @NotBlank
        @Size(max = 128)
        String mediaId,

        @NotBlank
        @Size(max = 32)
        String kind,

        @NotBlank
        @Size(max = 128)
        String contentType) {
}
