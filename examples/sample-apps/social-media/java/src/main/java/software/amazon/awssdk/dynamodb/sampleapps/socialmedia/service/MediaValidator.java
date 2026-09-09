package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.service;

import org.springframework.stereotype.Component;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.config.MediaProperties;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.exception.InvalidMediaException;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.MediaKind;

/**
 * Validates media attachments against the configured limits.
 *
 * <p>Enforces the recognized {@code kind} ({@code IMAGE}/{@code VIDEO}), the allowed content types
 * per kind, the agreement between {@code kind} and {@code contentType}, the per-post attachment cap
 * ({@code media.max-per-post}), and the per-object size limits
 * ({@code media.max-image-bytes}/{@code media.max-video-bytes}). Every breach throws
 * {@link InvalidMediaException}, which maps to {@code 400 INVALID_MEDIA}.
 */
@Component
public class MediaValidator {

private final MediaProperties properties;

    /**
     * @param properties media and S3-key configuration
     */
    public MediaValidator(MediaProperties properties) {
        this.properties = properties;
    }

    /**
     * Parses and validates a declared {@code kind}, checking it agrees with {@code contentType} and
     * that the content type is allowed for that kind.
     *
     * @param kind        declared kind string ({@code IMAGE} or {@code VIDEO})
     * @param contentType declared MIME type
     * @return the parsed {@link MediaKind}
     * @throws InvalidMediaException when the kind is unrecognized, the content type is disallowed, or
     *     the two disagree
     */
    public MediaKind validateKindAndContentType(String kind, String contentType) {
        MediaKind parsed = parseKind(kind);
        if (contentType == null || contentType.isBlank()) {
            throw new InvalidMediaException("contentType is required");
        }
        boolean imageType = properties.allowedImageContentTypes().contains(contentType);
        boolean videoType = properties.allowedVideoContentTypes().contains(contentType);
        if (parsed == MediaKind.IMAGE && !imageType) {
            throw new InvalidMediaException("contentType is not an allowed image type: " + contentType);
        }
        if (parsed == MediaKind.VIDEO && !videoType) {
            throw new InvalidMediaException("contentType is not an allowed video type: " + contentType);
        }
        return parsed;
    }

    /**
     * Validates the optional declared upload size against the per-kind limit.
     *
     * @param kind      the parsed media kind
     * @param sizeBytes declared size in bytes, or {@code null} when not provided
     * @throws InvalidMediaException when the declared size exceeds the per-kind limit
     */
    public void validateDeclaredSize(MediaKind kind, Long sizeBytes) {
        if (sizeBytes == null) {
            return;
        }
        validateObjectSize(kind, sizeBytes);
    }

    /**
     * Validates an object's actual size (from an S3 {@code HEAD}) against the per-kind limit.
     *
     * @param kind      the media kind
     * @param sizeBytes actual object size in bytes
     * @throws InvalidMediaException when the object exceeds the per-kind limit
     */
    public void validateObjectSize(MediaKind kind, long sizeBytes) {
        long limit = kind == MediaKind.IMAGE ? properties.maxImageBytes() : properties.maxVideoBytes();
        if (sizeBytes > limit) {
            throw new InvalidMediaException(
                    "media object exceeds the " + kind + " size limit of " + limit + " bytes");
        }
    }

    /**
     * Validates the number of attachments on a post does not exceed {@code media.max-per-post}.
     *
     * @param count number of attachments
     * @throws InvalidMediaException when the count exceeds the cap
     */
    public void validatePostAttachmentCount(int count) {
        if (count > properties.maxPerPost()) {
            throw new InvalidMediaException(
                    "a post carries at most " + properties.maxPerPost() + " media attachments");
        }
    }

    /**
     * Validates the number of attachments on an expiring content does not exceed one. an expiring content is
     * text-only, media-only, or both, and holds at most a single image or video.
     *
     * @param count number of attachments
     * @throws InvalidMediaException when the operation carries more than one attachment
     */
    public void validateStoryAttachmentCount(int count) {
        if (count > 1) {
            throw new InvalidMediaException("a story carries at most one media attachment");
        }
    }

    /**
     * Parses a {@code kind} string to {@link MediaKind}, rejecting unknown values.
     *
     * @param kind declared kind string
     * @return the parsed kind
     * @throws InvalidMediaException when the value is null, blank, or not a recognized kind
     */
    private MediaKind parseKind(String kind) {
        if (kind == null || kind.isBlank()) {
            throw new InvalidMediaException("kind is required");
        }
        try {
            return MediaKind.valueOf(kind);
        } catch (IllegalArgumentException e) {
            throw new InvalidMediaException("kind must be IMAGE or VIDEO: " + kind);
        }
    }
}
