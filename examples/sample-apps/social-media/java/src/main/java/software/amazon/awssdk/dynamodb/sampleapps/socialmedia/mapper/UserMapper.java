package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.mapper;

import org.springframework.stereotype.Component;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto.CreateUserRequest;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto.CreateUserResponse;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.UserProfile;

/**
 * Maps between the user DTOs and the {@link UserProfile} persistence bean.
 *
 * <p>{@code updatedAt} and {@code version} are optional and out of the initial scope, so a freshly
 * created profile leaves them unset.
 */
@Component
public class UserMapper {

    /**
     * Builds a {@link UserProfile} row from a create request and a generated creation timestamp.
     *
     * @param request   validated create payload
     * @param createdAt ISO-8601 UTC creation instant string
     * @return a profile row keyed by {@code USER#<userId>} / {@code PROFILE}
     */
    public UserProfile toProfile(CreateUserRequest request, String createdAt) {
        UserProfile profile = new UserProfile();
        profile.setPk(UserProfile.partitionKey(request.userId()));
        profile.setSk(UserProfile.SORT_KEY);
        profile.setEntityType(UserProfile.ENTITY_TYPE);
        profile.setUserId(request.userId());
        profile.setDisplayName(request.displayName());
        profile.setCreatedAt(createdAt);
        return profile;
    }

    /**
     * Maps a stored profile to the API response shape.
     *
     * @param profile the persisted profile row
     * @return the response carrying {@code userId}, {@code displayName}, and {@code createdAt}
     */
    public CreateUserResponse toResponse(UserProfile profile) {
        return new CreateUserResponse(
                profile.getUserId(),
                profile.getDisplayName(),
                profile.getCreatedAt());
    }
}
