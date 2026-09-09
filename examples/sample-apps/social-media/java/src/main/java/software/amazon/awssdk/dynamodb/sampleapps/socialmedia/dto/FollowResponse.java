package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto;

/**
 * Response body for {@code POST /api/v1/users/{targetUserId}/follows}.
 *
 * <p>Returned with HTTP {@code 200} after both follow edges are written atomically. The follower is
 * the {@code X-User-Id} caller and the followee is the path {@code targetUserId}.
 *
 * @param followerId the caller who now follows the target
 * @param followeeId the target now followed by the caller
 * @param createdAt  edge creation instant as an ISO-8601 UTC string (for example {@code 2026-05-27T10:05:00Z})
 */
public record FollowResponse(
        String followerId,
        String followeeId,
        String createdAt) {
}
