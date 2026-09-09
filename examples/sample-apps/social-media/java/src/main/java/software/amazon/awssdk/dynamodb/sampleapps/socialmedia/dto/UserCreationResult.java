package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto;

import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.service.UserService;

/**
 * Internal result wrapper distinguishing a first-time profile create from an idempotent replay.
 *
 * <p>Used by {@link UserService} so the controller returns HTTP {@code 201} for a newly created
 * profile or HTTP {@code 200} when the same {@code userId} replays the stored profile.
 *
 * @param response     the profile response to return to the client
 * @param newlyCreated {@code true} when the profile was just created, {@code false} for a replay
 */
public record UserCreationResult(
        CreateUserResponse response,
        boolean newlyCreated) {
}
