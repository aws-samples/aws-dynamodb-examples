package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model;

/**
 * An S3 object reference plus lightweight metadata for one media attachment on a post or expiring content.
 *
 * <p>Each DynamoDB post item stores only this reference. The bytes live in Amazon S3 (or an
 * S3-compatible store locally). The pair ({@link #s3Bucket()}, {@link #s3Key()}) is the S3 object
 * reference. HTTP responses expose a time-limited presigned download URL instead of the raw
 * bucket and key.
 *
 * <p>The {@code media[]} list of these references is persisted with a custom enhanced-client
 * converter so the stored shape stays a native DynamoDB list of maps regardless of client type.
 *
 * @param mediaId         stable media id, also used to derive the S3 object key
 * @param kind            {@code IMAGE} or {@code VIDEO}
 * @param contentType     MIME type, for example {@code image/jpeg} or {@code video/mp4}
 * @param s3Bucket        bucket holding the object
 * @param s3Key           object key under the configured prefix
 * @param sizeBytes       object size in bytes, or {@code null} when unknown
 * @param width           image or video width in pixels, or {@code null} when not applicable
 * @param height          image or video height in pixels, or {@code null} when not applicable
 * @param durationSeconds video duration in seconds, or {@code null} for images
 */
public record MediaRef(
        String mediaId,
        String kind,
        String contentType,
        String s3Bucket,
        String s3Key,
        Long sizeBytes,
        Integer width,
        Integer height,
        Integer durationSeconds) {
}
