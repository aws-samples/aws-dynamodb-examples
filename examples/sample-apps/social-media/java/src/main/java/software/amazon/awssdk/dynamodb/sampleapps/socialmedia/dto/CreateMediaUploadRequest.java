package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

/**
 * Request body for the supporting {@code POST /api/v1/media} upload prelude.
 *
 * <p>The route is visibility-agnostic and writes no DynamoDB row. It stages a single object for a
 * later post to reference. {@code kind} must agree with {@code contentType} and both are validated by
 * the service so a rule breach maps to {@code INVALID_MEDIA}.
 *
 * @param kind        required, {@code IMAGE} or {@code VIDEO}
 * @param contentType required MIME type, in {@code media.allowed-image/video-content-types}
 * @param sizeBytes   optional declared size, within {@code media.max-image-bytes}/{@code max-video-bytes}
 */
public record CreateMediaUploadRequest(
        @NotBlank
        @Size(max = 32)
        String kind,

        @NotBlank
        @Size(max = 128)
        String contentType,

        @Positive
        Long sizeBytes) {
}
