package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.unit.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto.LikePostResponse;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.exception.AlreadyLikedException;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.exception.MissingActorException;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.exception.PostNotFoundException;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.exception.UserNotFoundException;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.mapper.LikeMapper;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.Like;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.PostMeta;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.UserProfile;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.Visibility;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.ContentRepository;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.UserGraphRepository;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.service.LikeService;
import software.amazon.awssdk.services.dynamodb.model.CancellationReason;
import software.amazon.awssdk.services.dynamodb.model.TransactionCanceledException;

/**
 * Unit coverage for the operation 5 like flow. No Docker or Spring context is required.
 * The repositories are mocked so the actor, existence, visibility, and duplicate branches are
 * exercised in isolation.
 */
@Tag("unit")
@ExtendWith(MockitoExtension.class)
class LikeServiceTest {

    @Mock
    private UserGraphRepository userGraphRepository;

    @Mock
    private ContentRepository contentRepository;

    private LikeService service;

    @BeforeEach
    void setUp() {
        service = new LikeService(userGraphRepository, contentRepository, new LikeMapper());
    }

    @Test
    void firstLikeWritesEdgeAndReturnsUpdatedCount() {
        stubLiker("user_bob");
        stubReadThenUpdated(publicPost("post_1", "user_alice"), postWithLikeCount("post_1", "user_alice", 1L));
        when(contentRepository.likeTransaction(any(Like.class)))
                .thenReturn(CompletableFuture.completedFuture(null));

        LikePostResponse response = service.like("user_bob", "post_1").join();

        assertThat(response.postId()).isEqualTo("post_1");
        assertThat(response.userId()).isEqualTo("user_bob");
        assertThat(response.likeCount()).isEqualTo(1L);
        verify(contentRepository).likeTransaction(any(Like.class));
    }

    @Test
    void blankActorThrowsMissingActor() {
        assertThatThrownBy(() -> service.like("  ", "post_1"))
                .isInstanceOf(MissingActorException.class);
        verify(contentRepository, never()).likeTransaction(any());
    }

    @Test
    void nullActorThrowsMissingActor() {
        assertThatThrownBy(() -> service.like(null, "post_1"))
                .isInstanceOf(MissingActorException.class);
        verify(contentRepository, never()).likeTransaction(any());
    }

    @Test
    void unknownPostRaisesPostNotFound() {
        when(contentRepository.getPostMeta(eq("post_missing")))
                .thenReturn(CompletableFuture.completedFuture(null));
        when(userGraphRepository.getProfile(eq("user_bob")))
                .thenReturn(CompletableFuture.completedFuture(profile("user_bob")));

        assertThatThrownBy(() -> service.like("user_bob", "post_missing").join())
                .isInstanceOf(CompletionException.class)
                .hasCauseInstanceOf(PostNotFoundException.class);
        verify(contentRepository, never()).likeTransaction(any());
    }

    @Test
    void unknownLikerRaisesUserNotFound() {
        when(contentRepository.getPostMeta(eq("post_1")))
                .thenReturn(CompletableFuture.completedFuture(publicPost("post_1", "user_alice")));
        when(userGraphRepository.getProfile(eq("user_bob")))
                .thenReturn(CompletableFuture.completedFuture(null));

        assertThatThrownBy(() -> service.like("user_bob", "post_1").join())
                .isInstanceOf(CompletionException.class)
                .hasCauseInstanceOf(UserNotFoundException.class);
        verify(contentRepository, never()).likeTransaction(any());
    }

    @Test
    void privatePostHiddenFromNonAuthorRaisesPostNotFound() {
        stubPostAndLiker(post("post_1", "user_alice", Visibility.PRIVATE, null), "user_bob");

        assertThatThrownBy(() -> service.like("user_bob", "post_1").join())
                .isInstanceOf(CompletionException.class)
                .hasCauseInstanceOf(PostNotFoundException.class);
        verify(contentRepository, never()).likeTransaction(any());
    }

    @Test
    void restrictedPostAllowsListedViewer() {
        stubLiker("user_bob");
        stubReadThenUpdated(
                post("post_1", "user_alice", Visibility.RESTRICTED, List.of("user_bob")),
                postWithLikeCount("post_1", "user_alice", 1L));
        when(contentRepository.likeTransaction(any(Like.class)))
                .thenReturn(CompletableFuture.completedFuture(null));

        LikePostResponse response = service.like("user_bob", "post_1").join();

        assertThat(response.likeCount()).isEqualTo(1L);
    }

    @Test
    void restrictedPostHidesUnlistedViewer() {
        stubPostAndLiker(post("post_1", "user_alice", Visibility.RESTRICTED, List.of("user_carol")), "user_bob");

        assertThatThrownBy(() -> service.like("user_bob", "post_1").join())
                .isInstanceOf(CompletionException.class)
                .hasCauseInstanceOf(PostNotFoundException.class);
        verify(contentRepository, never()).likeTransaction(any());
    }

    @Test
    void authorMayLikeOwnPrivatePost() {
        stubLiker("user_alice");
        stubReadThenUpdated(
                post("post_1", "user_alice", Visibility.PRIVATE, null),
                postWithLikeCount("post_1", "user_alice", 1L));
        when(contentRepository.likeTransaction(any(Like.class)))
                .thenReturn(CompletableFuture.completedFuture(null));

        LikePostResponse response = service.like("user_alice", "post_1").join();

        assertThat(response.likeCount()).isEqualTo(1L);
    }

    @Test
    void duplicateLikeRaisesAlreadyLiked() {
        stubPostAndLiker(publicPost("post_1", "user_alice"), "user_bob");
        when(contentRepository.likeTransaction(any(Like.class)))
                .thenReturn(CompletableFuture.failedFuture(guardFailure("ConditionalCheckFailed", "None")));

        assertThatThrownBy(() -> service.like("user_bob", "post_1").join())
                .isInstanceOf(CompletionException.class)
                .hasCauseInstanceOf(AlreadyLikedException.class);
    }

    @Test
    void postDeletedDuringLikeRaisesPostNotFound() {
        stubPostAndLiker(publicPost("post_1", "user_alice"), "user_bob");
        when(contentRepository.likeTransaction(any(Like.class)))
                .thenReturn(CompletableFuture.failedFuture(guardFailure("None", "ConditionalCheckFailed")));

        assertThatThrownBy(() -> service.like("user_bob", "post_1").join())
                .isInstanceOf(CompletionException.class)
                .hasCauseInstanceOf(PostNotFoundException.class);
    }

    private void stubPostAndLiker(PostMeta meta, String likerId) {
        when(contentRepository.getPostMeta(eq(meta.getPostId())))
                .thenReturn(CompletableFuture.completedFuture(meta));
        when(userGraphRepository.getProfile(eq(likerId)))
                .thenReturn(CompletableFuture.completedFuture(profile(likerId)));
    }

    private void stubLiker(String likerId) {
        when(userGraphRepository.getProfile(eq(likerId)))
                .thenReturn(CompletableFuture.completedFuture(profile(likerId)));
    }

    private void stubReadThenUpdated(PostMeta beforeLike, PostMeta afterLike) {
        when(contentRepository.getPostMeta(eq(beforeLike.getPostId())))
                .thenReturn(CompletableFuture.completedFuture(beforeLike))
                .thenReturn(CompletableFuture.completedFuture(afterLike));
    }

    private static TransactionCanceledException guardFailure(String likeReason, String counterReason) {
        return TransactionCanceledException.builder()
                .cancellationReasons(
                        CancellationReason.builder().code(likeReason).build(),
                        CancellationReason.builder().code(counterReason).build())
                .build();
    }

    private static PostMeta publicPost(String postId, String authorId) {
        return post(postId, authorId, Visibility.PUBLIC, null);
    }

    private static PostMeta postWithLikeCount(String postId, String authorId, Long likeCount) {
        PostMeta meta = publicPost(postId, authorId);
        meta.setLikeCount(likeCount);
        return meta;
    }

    private static PostMeta post(String postId, String authorId, Visibility visibility, List<String> allowed) {
        PostMeta meta = new PostMeta();
        meta.setPk(PostMeta.partitionKey(postId));
        meta.setSk(PostMeta.SORT_KEY);
        meta.setEntityType(PostMeta.ENTITY_TYPE);
        meta.setPostId(postId);
        meta.setAuthorId(authorId);
        meta.setType("POST");
        meta.setVisibility(visibility.name());
        meta.setAllowedViewerUserIds(allowed);
        meta.setText("hello");
        meta.setCreatedAt("2026-05-27T11:00:00Z");
        meta.setLikeCount(0L);
        return meta;
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
