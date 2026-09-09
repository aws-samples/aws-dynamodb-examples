package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.unit.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto.CreateUserRequest;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto.UserCreationResult;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.mapper.UserMapper;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.UserProfile;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.UserGraphRepository;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.service.UserService;
import software.amazon.awssdk.services.dynamodb.model.ConditionalCheckFailedException;
import software.amazon.awssdk.services.dynamodb.model.DynamoDbException;

/**
 * Unit coverage for the operation 1 idempotent create flow. No Docker or Spring context
 * is required. The repository is mocked so first-write, stored-profile replay, missing-profile
 * recovery failure, and unrelated DynamoDB error propagation are exercised in isolation.
 */
@Tag("unit")
@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserGraphRepository userGraphRepository;

    private UserService service;

    /**
     * Wires the service with a mocked repository and a real mapper.
     */
    @BeforeEach
    void setUp() {
        service = new UserService(userGraphRepository, new UserMapper());
    }

    @Test
    void createUser_whenFirstWrite_succeeds() {
        CreateUserRequest request = new CreateUserRequest("user_diana", "Diana", null);
        when(userGraphRepository.putProfileIfAbsent(any()))
                .thenReturn(CompletableFuture.completedFuture(null));

        UserCreationResult result = service.createUser(request).join();

        assertThat(result.newlyCreated()).isTrue();
        assertThat(result.response().userId()).isEqualTo("user_diana");
        assertThat(result.response().displayName()).isEqualTo("Diana");
        assertThat(result.response().createdAt()).endsWith("Z");
        verify(userGraphRepository, never()).getProfile(any());
    }

    @Test
    void createUser_withMatchingDisplayNameRetry_replaysStoredProfile() {
        CreateUserRequest request = new CreateUserRequest("user_diana", "Diana", null);
        when(userGraphRepository.putProfileIfAbsent(any()))
                .thenReturn(CompletableFuture.failedFuture(ConditionalCheckFailedException.builder().build()));
        when(userGraphRepository.getProfile(eq("user_diana")))
                .thenReturn(CompletableFuture.completedFuture(
                        storedProfile("user_diana", "Diana", "2026-05-27T10:00:00Z")));

        UserCreationResult result = service.createUser(request).join();

        assertThat(result.newlyCreated()).isFalse();
        assertThat(result.response().displayName()).isEqualTo("Diana");
        assertThat(result.response().createdAt()).isEqualTo("2026-05-27T10:00:00Z");
    }

    @Test
    void createUser_withChangedDisplayNameRetry_replaysStoredProfile() {
        CreateUserRequest request = new CreateUserRequest("user_diana", "Impostor", null);
        when(userGraphRepository.putProfileIfAbsent(any()))
                .thenReturn(CompletableFuture.failedFuture(ConditionalCheckFailedException.builder().build()));
        when(userGraphRepository.getProfile(eq("user_diana")))
                .thenReturn(CompletableFuture.completedFuture(
                        storedProfile("user_diana", "Diana", "2026-05-27T10:00:00Z")));

        UserCreationResult result = service.createUser(request).join();

        assertThat(result.newlyCreated()).isFalse();
        assertThat(result.response().displayName()).isEqualTo("Diana");
        assertThat(result.response().createdAt()).isEqualTo("2026-05-27T10:00:00Z");
    }

    @Test
    void createUser_whenProfileMissingAfterConditionalConflict_fails() {
        CreateUserRequest request = new CreateUserRequest("user_diana", "Diana", null);
        when(userGraphRepository.putProfileIfAbsent(any()))
                .thenReturn(CompletableFuture.failedFuture(ConditionalCheckFailedException.builder().build()));
        when(userGraphRepository.getProfile(eq("user_diana")))
                .thenReturn(CompletableFuture.completedFuture(null));

        assertThatThrownBy(() -> service.createUser(request).join())
                .isInstanceOf(CompletionException.class)
                .hasCauseInstanceOf(IllegalStateException.class);
    }

    @Test
    void createUser_whenUnrelatedDynamoDbFailure_propagatesCause() {
        CreateUserRequest request = new CreateUserRequest("user_diana", "Diana", null);
        when(userGraphRepository.putProfileIfAbsent(any()))
                .thenReturn(CompletableFuture.failedFuture(
                        DynamoDbException.builder().message("throttled").build()));

        assertThatThrownBy(() -> service.createUser(request).join())
                .isInstanceOf(CompletionException.class)
                .hasCauseInstanceOf(DynamoDbException.class);
        verify(userGraphRepository, never()).getProfile(any());
    }

    /**
     * Builds a stored profile fixture for replay tests.
     *
     * @param userId      profile owner
     * @param displayName stored display name
     * @param createdAt   stored creation timestamp
     * @return populated profile bean
     */
    private static UserProfile storedProfile(String userId, String displayName, String createdAt) {
        UserProfile profile = new UserProfile();
        profile.setPk(UserProfile.partitionKey(userId));
        profile.setSk(UserProfile.SORT_KEY);
        profile.setEntityType(UserProfile.ENTITY_TYPE);
        profile.setUserId(userId);
        profile.setDisplayName(displayName);
        profile.setCreatedAt(createdAt);
        return profile;
    }
}
