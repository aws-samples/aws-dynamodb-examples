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
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto.FollowResponse;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.exception.AlreadyFollowingException;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.exception.CannotFollowSelfException;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.exception.MissingActorException;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.exception.UserNotFoundException;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.mapper.FollowMapper;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.FollowerEdge;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.FollowingEdge;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.UserProfile;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.UserGraphRepository;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.service.FollowService;
import software.amazon.awssdk.services.dynamodb.model.CancellationReason;
import software.amazon.awssdk.services.dynamodb.model.TransactionCanceledException;

/**
 * Unit coverage for the operation 2 follow flow. No Docker or Spring context is
 * required. The repository is mocked so the actor, self-follow, existence, and duplicate branches are
 * exercised in isolation.
 */
@Tag("unit")
@ExtendWith(MockitoExtension.class)
class FollowServiceTest {

    @Mock
    private UserGraphRepository userGraphRepository;

    private FollowService service;

    @BeforeEach
    void setUp() {
        service = new FollowService(userGraphRepository, new FollowMapper());
    }

    @Test
    void validFollowWritesBothEdgesAndReturnsResponse() {
        when(userGraphRepository.getProfile(eq("user_alice")))
                .thenReturn(CompletableFuture.completedFuture(profile("user_alice")));
        when(userGraphRepository.getProfile(eq("user_bob")))
                .thenReturn(CompletableFuture.completedFuture(profile("user_bob")));
        when(userGraphRepository.followTransaction(any(FollowingEdge.class), any(FollowerEdge.class)))
                .thenReturn(CompletableFuture.completedFuture(null));

        FollowResponse response = service.follow("user_alice", "user_bob").join();

        assertThat(response.followerId()).isEqualTo("user_alice");
        assertThat(response.followeeId()).isEqualTo("user_bob");
        assertThat(response.createdAt()).endsWith("Z");
        verify(userGraphRepository).followTransaction(any(FollowingEdge.class), any(FollowerEdge.class));
    }

    @Test
    void blankActorThrowsMissingActor() {
        assertThatThrownBy(() -> service.follow("  ", "user_bob"))
                .isInstanceOf(MissingActorException.class);
        verify(userGraphRepository, never()).followTransaction(any(), any());
    }

    @Test
    void nullActorThrowsMissingActor() {
        assertThatThrownBy(() -> service.follow(null, "user_bob"))
                .isInstanceOf(MissingActorException.class);
        verify(userGraphRepository, never()).followTransaction(any(), any());
    }

    @Test
    void selfFollowThrowsCannotFollowSelf() {
        assertThatThrownBy(() -> service.follow("user_alice", "user_alice"))
                .isInstanceOf(CannotFollowSelfException.class);
        verify(userGraphRepository, never()).getProfile(any());
        verify(userGraphRepository, never()).followTransaction(any(), any());
    }

    @Test
    void unknownFollowerRaisesUserNotFound() {
        when(userGraphRepository.getProfile(eq("user_alice")))
                .thenReturn(CompletableFuture.completedFuture(null));
        when(userGraphRepository.getProfile(eq("user_bob")))
                .thenReturn(CompletableFuture.completedFuture(profile("user_bob")));

        assertThatThrownBy(() -> service.follow("user_alice", "user_bob").join())
                .isInstanceOf(CompletionException.class)
                .hasCauseInstanceOf(UserNotFoundException.class);
        verify(userGraphRepository, never()).followTransaction(any(), any());
    }

    @Test
    void unknownFolloweeRaisesUserNotFound() {
        when(userGraphRepository.getProfile(eq("user_alice")))
                .thenReturn(CompletableFuture.completedFuture(profile("user_alice")));
        when(userGraphRepository.getProfile(eq("user_bob")))
                .thenReturn(CompletableFuture.completedFuture(null));

        assertThatThrownBy(() -> service.follow("user_alice", "user_bob").join())
                .isInstanceOf(CompletionException.class)
                .hasCauseInstanceOf(UserNotFoundException.class);
        verify(userGraphRepository, never()).followTransaction(any(), any());
    }

    @Test
    void duplicateFollowRaisesAlreadyFollowing() {
        when(userGraphRepository.getProfile(eq("user_alice")))
                .thenReturn(CompletableFuture.completedFuture(profile("user_alice")));
        when(userGraphRepository.getProfile(eq("user_bob")))
                .thenReturn(CompletableFuture.completedFuture(profile("user_bob")));
        when(userGraphRepository.followTransaction(any(FollowingEdge.class), any(FollowerEdge.class)))
                .thenReturn(CompletableFuture.failedFuture(conditionalTransactionFailure()));

        assertThatThrownBy(() -> service.follow("user_alice", "user_bob").join())
                .isInstanceOf(CompletionException.class)
                .hasCauseInstanceOf(AlreadyFollowingException.class);
    }

    private static TransactionCanceledException conditionalTransactionFailure() {
        return TransactionCanceledException.builder()
                .cancellationReasons(
                        CancellationReason.builder().code("ConditionalCheckFailed").build(),
                        CancellationReason.builder().code("None").build())
                .build();
    }

    private static UserProfile profile(String userId) {
        UserProfile profile = new UserProfile();
        profile.setPk(UserProfile.partitionKey(userId));
        profile.setSk(UserProfile.SORT_KEY);
        profile.setEntityType(UserProfile.ENTITY_TYPE);
        profile.setUserId(userId);
        profile.setDisplayName(userId);
        profile.setCreatedAt("2026-05-27T10:00:00Z");
        return profile;
    }
}
