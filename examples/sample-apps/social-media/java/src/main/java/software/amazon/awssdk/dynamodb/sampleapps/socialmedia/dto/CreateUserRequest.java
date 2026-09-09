package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Request body for {@code POST /api/v1/users}.
 *
 * <p>This is the only route that carries the new {@code userId} in the body and takes no
 * {@code X-User-Id} header. {@code userId} is the natural idempotency key: a retry with the same
 * {@code userId} replays the stored profile, including when {@code displayName} differs.
 *
 * @param userId          natural user id, length 3..64, pattern {@value #USER_ID_PATTERN}
 * @param displayName     human-readable name shown in the UI, length 1..100, not blank
 * @param clientRequestId optional client-supplied correlation id, length 1..128 when present
 */
public record CreateUserRequest(
        @NotBlank
        @Size(min = 3, max = 64)
        @Pattern(regexp = CreateUserRequest.USER_ID_PATTERN, message = "must match " + CreateUserRequest.USER_ID_PATTERN)
        String userId,

        @NotBlank
        @Size(min = 1, max = 100)
        String displayName,

        @Size(min = 1, max = 128)
        String clientRequestId) {

public static final String USER_ID_PATTERN = "^[A-Za-z0-9_-]+$";
}
