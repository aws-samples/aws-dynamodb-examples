package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.unit.mapper;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto.CreateUserRequest;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto.CreateUserResponse;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.mapper.UserMapper;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.UserProfile;

/**
 * Unit coverage for the operation 1 profile mapping. Verifies the persisted key shape and the
 * response projection without any Docker or Spring context.
 */
@Tag("unit")
class UserMapperTest {

    private final UserMapper mapper = new UserMapper();

    @Test
    void toProfileBuildsCanonicalKeyAndEntityType() {
        CreateUserRequest request = new CreateUserRequest("user_diana", "Diana", "req-1");

        UserProfile profile = mapper.toProfile(request, "2026-05-27T10:00:00Z");

        assertThat(profile.getPk()).isEqualTo("USER#user_diana");
        assertThat(profile.getSk()).isEqualTo(UserProfile.SORT_KEY);
        assertThat(profile.getEntityType()).isEqualTo(UserProfile.ENTITY_TYPE);
        assertThat(profile.getUserId()).isEqualTo("user_diana");
        assertThat(profile.getDisplayName()).isEqualTo("Diana");
        assertThat(profile.getCreatedAt()).isEqualTo("2026-05-27T10:00:00Z");
        // updatedAt and version are out of the initial scope and stay unset.
        assertThat(profile.getUpdatedAt()).isNull();
        assertThat(profile.getVersion()).isNull();
    }

    @Test
    void toResponseProjectsStoredProfileFields() {
        UserProfile profile = new UserProfile();
        profile.setUserId("user_diana");
        profile.setDisplayName("Diana");
        profile.setCreatedAt("2026-05-27T10:00:00Z");

        CreateUserResponse response = mapper.toResponse(profile);

        assertThat(response.userId()).isEqualTo("user_diana");
        assertThat(response.displayName()).isEqualTo("Diana");
        assertThat(response.createdAt()).isEqualTo("2026-05-27T10:00:00Z");
    }
}
