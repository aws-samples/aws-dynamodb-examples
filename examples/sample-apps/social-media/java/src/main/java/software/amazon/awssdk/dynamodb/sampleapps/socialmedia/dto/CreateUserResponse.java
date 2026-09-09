package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto;

/**
 * Response body for {@code POST /api/v1/users}.
 *
 * <p>Returned with HTTP {@code 201} on first create and HTTP {@code 200} on an idempotent retry that
 * replays the stored profile.
 *
 * @param userId      natural user id
 * @param displayName human-readable name
 * @param createdAt   creation instant as an ISO-8601 UTC string (for example {@code 2026-05-27T10:00:00Z})
 */
public record CreateUserResponse(
        String userId,
        String displayName,
        String createdAt) {
}
