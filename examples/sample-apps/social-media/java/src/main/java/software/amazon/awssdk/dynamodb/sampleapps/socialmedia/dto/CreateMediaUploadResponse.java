package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto;

/**
 * Response body for the supporting {@code POST /api/v1/media} upload prelude.
 *
 * <p>Returned with HTTP {@code 200}. The client uploads the bytes directly to {@code uploadUrl}
 * with the {@code uploadMethod} verb before publishing a post that references {@code mediaId}. The
 * URL expires at {@code expiresAt} ({@code media.presign-ttl-seconds} after minting).
 *
 * @param mediaId      stable media id, later referenced by a post
 * @param kind         {@code IMAGE} or {@code VIDEO}
 * @param contentType  MIME type the client must upload with
 * @param uploadUrl    short-lived presigned upload URL
 * @param uploadMethod HTTP verb for the upload ({@code PUT})
 * @param expiresAt    upload URL expiry as an ISO-8601 UTC string
 */
public record CreateMediaUploadResponse(
        String mediaId,
        String kind,
        String contentType,
        String uploadUrl,
        String uploadMethod,
        String expiresAt) {
}
