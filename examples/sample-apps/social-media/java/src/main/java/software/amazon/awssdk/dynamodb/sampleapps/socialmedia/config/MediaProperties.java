package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.config;

import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Binds the media and S3 object-key configuration keys used by the  media flow.
 *
 * <p>Holds the presign TTL, per-post attachment limit, allowed content types, and size limits, plus
 * the S3 bucket and key prefix. Shared by the media validator and the S3 gateway so limits stay
 * defined in one place.
 */
@Component
public class MediaProperties {

private final String bucketName;

private final String keyPrefix;

private final int presignTtlSeconds;

private final int maxPerPost;

private final List<String> allowedImageContentTypes;

private final List<String> allowedVideoContentTypes;

private final long maxImageBytes;

private final long maxVideoBytes;

    /**
     * Binds the media and S3-key configuration values.
     *
     * @param bucketName               media bucket name
     * @param keyPrefix                object key prefix
     * @param presignTtlSeconds        presigned URL validity in seconds
     * @param maxPerPost               max attachments per post
     * @param allowedImageContentTypes allowed image MIME types
     * @param allowedVideoContentTypes allowed video MIME types
     * @param maxImageBytes            max image object size in bytes
     * @param maxVideoBytes            max video object size in bytes
     */
    public MediaProperties(
            @Value("${s3.bucket-name}") String bucketName,
            @Value("${s3.key-prefix:media/}") String keyPrefix,
            @Value("${media.presign-ttl-seconds:900}") int presignTtlSeconds,
            @Value("${media.max-per-post:10}") int maxPerPost,
            @Value("${media.allowed-image-content-types:image/jpeg,image/png,image/webp,image/gif}")
            List<String> allowedImageContentTypes,
            @Value("${media.allowed-video-content-types:video/mp4,video/webm}")
            List<String> allowedVideoContentTypes,
            @Value("${media.max-image-bytes:10485760}") long maxImageBytes,
            @Value("${media.max-video-bytes:104857600}") long maxVideoBytes) {
        this.bucketName = bucketName;
        this.keyPrefix = keyPrefix;
        this.presignTtlSeconds = presignTtlSeconds;
        this.maxPerPost = maxPerPost;
        this.allowedImageContentTypes = List.copyOf(allowedImageContentTypes);
        this.allowedVideoContentTypes = List.copyOf(allowedVideoContentTypes);
        this.maxImageBytes = maxImageBytes;
        this.maxVideoBytes = maxVideoBytes;
    }

    public String bucketName() {
        return bucketName;
    }

    public String keyPrefix() {
        return keyPrefix;
    }

    public int presignTtlSeconds() {
        return presignTtlSeconds;
    }

    public int maxPerPost() {
        return maxPerPost;
    }

    public List<String> allowedImageContentTypes() {
        return allowedImageContentTypes;
    }

    public List<String> allowedVideoContentTypes() {
        return allowedVideoContentTypes;
    }

    public long maxImageBytes() {
        return maxImageBytes;
    }

    public long maxVideoBytes() {
        return maxVideoBytes;
    }

    /**
     * Derives the deterministic S3 object key for a user's media id.
     *
     * @param userId  uploading user id
     * @param mediaId stable media id
     * @return {@code <keyPrefix><userId>/<mediaId>}
     */
    public String objectKey(String userId, String mediaId) {
        return keyPrefix + userId + "/" + mediaId;
    }
}
