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
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto.PostContextResponse;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.exception.MissingActorException;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.exception.PostNotFoundException;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.exception.UserNotFoundException;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.mapper.PostContextMapper;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.mapper.PostMapper;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.FollowingEdge;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.Like;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.MediaRef;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.PostMeta;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.UserProfile;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.Visibility;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.ContentRepository;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.PostContextItems;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.PostContextRepository;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.service.PostContextService;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.service.S3MediaGateway;

/**
 * Unit coverage for the operation 6 post-context flow. No Docker or Spring context is
 * required. The repositories and the S3 gateway are mocked so the actor, existence, visibility, and
 * edge-merge branches are exercised in isolation.
 */
@Tag("unit")
@ExtendWith(MockitoExtension.class)
class PostContextServiceTest {

    @Mock
    private ContentRepository contentRepository;

    @Mock
    private PostContextRepository postContextRepository;

    @Mock
    private S3MediaGateway s3MediaGateway;

    private PostContextService service;

    @BeforeEach
    void setUp() {
        service = new PostContextService(contentRepository, postContextRepository,
                s3MediaGateway, new PostContextMapper(), new PostMapper());
    }

    @Test
    void permittedViewerGetsPostAuthorFollowAndLikeState() {
        PostMeta meta = publicPost("post_1", "user_alice");
        stubGate(meta, "user_bob");
        when(postContextRepository.loadPostContext(eq("post_1"), eq("user_bob"), eq("user_alice")))
                .thenReturn(CompletableFuture.completedFuture(new PostContextItems(
                        withLikeCount(meta, 1L), profile("user_bob"), like("post_1", "user_bob"),
                        profile("user_alice"), followingEdge("user_bob", "user_alice"))));

        PostContextResponse response = service.getContext("user_bob", "post_1").join();

        assertThat(response.post().postId()).isEqualTo("post_1");
        assertThat(response.post().authorId()).isEqualTo("user_alice");
        assertThat(response.post().likeCount()).isEqualTo(1L);
        assertThat(response.author().userId()).isEqualTo("user_alice");
        assertThat(response.author().displayName()).isEqualTo("user_alice");
        assertThat(response.isFollowing()).isTrue();
        assertThat(response.likedByViewer()).isTrue();
        assertThat(response.post().media()).isNull();
    }

    @Test
    void missingOptionalEdgesSurfaceAsFalse() {
        PostMeta meta = publicPost("post_1", "user_alice");
        stubGate(meta, "user_bob");
        when(postContextRepository.loadPostContext(eq("post_1"), eq("user_bob"), eq("user_alice")))
                .thenReturn(CompletableFuture.completedFuture(new PostContextItems(
                        meta, profile("user_bob"), null, profile("user_alice"), null)));

        PostContextResponse response = service.getContext("user_bob", "post_1").join();

        assertThat(response.isFollowing()).isFalse();
        assertThat(response.likedByViewer()).isFalse();
    }

    @Test
    void mediaIsEnrichedWithPresignedUrl() {
        PostMeta meta = publicPost("post_1", "user_alice");
        meta.setMedia(List.of(new MediaRef("media_1", "IMAGE", "image/jpeg",
                "bucket", "media/user_alice/media_1", 12L, null, null, null)));
        stubGate(meta, "user_bob");
        when(postContextRepository.loadPostContext(eq("post_1"), eq("user_bob"), eq("user_alice")))
                .thenReturn(CompletableFuture.completedFuture(new PostContextItems(
                        meta, profile("user_bob"), null, profile("user_alice"), null)));
        when(s3MediaGateway.presignDownload(eq("bucket"), eq("media/user_alice/media_1")))
                .thenReturn("https://s3.example.com/media/user_alice/media_1?X-Amz-Signature=abc");

        PostContextResponse response = service.getContext("user_bob", "post_1").join();

        assertThat(response.post().media()).hasSize(1);
        assertThat(response.post().media().get(0).mediaId()).isEqualTo("media_1");
        assertThat(response.post().media().get(0).url()).contains("X-Amz-Signature");
    }

    @Test
    void blankActorThrowsMissingActor() {
        assertThatThrownBy(() -> service.getContext("  ", "post_1"))
                .isInstanceOf(MissingActorException.class);
        verify(postContextRepository, never()).loadPostContext(any(), any(), any());
    }

    @Test
    void nullActorThrowsMissingActor() {
        assertThatThrownBy(() -> service.getContext(null, "post_1"))
                .isInstanceOf(MissingActorException.class);
        verify(postContextRepository, never()).loadPostContext(any(), any(), any());
    }

    @Test
    void unknownPostRaisesPostNotFound() {
        when(contentRepository.getPostMeta(eq("post_missing")))
                .thenReturn(CompletableFuture.completedFuture(null));
        assertThatThrownBy(() -> service.getContext("user_bob", "post_missing").join())
                .isInstanceOf(CompletionException.class)
                .hasCauseInstanceOf(PostNotFoundException.class);
        verify(postContextRepository, never()).loadPostContext(any(), any(), any());
    }

    @Test
    void unknownViewerRaisesUserNotFound() {
        when(contentRepository.getPostMeta(eq("post_1")))
                .thenReturn(CompletableFuture.completedFuture(publicPost("post_1", "user_alice")));
        when(postContextRepository.loadPostContext(eq("post_1"), eq("user_bob"), eq("user_alice")))
                .thenReturn(CompletableFuture.completedFuture(new PostContextItems(
                        publicPost("post_1", "user_alice"), null, null, profile("user_alice"), null)));

        assertThatThrownBy(() -> service.getContext("user_bob", "post_1").join())
                .isInstanceOf(CompletionException.class)
                .hasCauseInstanceOf(UserNotFoundException.class);
    }

    @Test
    void privatePostHiddenFromNonAuthorRaisesPostNotFound() {
        PostMeta meta = post("post_1", "user_alice", Visibility.PRIVATE, null);
        stubGate(meta, "user_bob");
        when(postContextRepository.loadPostContext(eq("post_1"), eq("user_bob"), eq("user_alice")))
                .thenReturn(CompletableFuture.completedFuture(new PostContextItems(
                        meta, profile("user_bob"), null, profile("user_alice"), null)));

        assertThatThrownBy(() -> service.getContext("user_bob", "post_1").join())
                .isInstanceOf(CompletionException.class)
                .hasCauseInstanceOf(PostNotFoundException.class);
    }

    @Test
    void restrictedPostHidesUnlistedViewer() {
        PostMeta meta = post("post_1", "user_alice", Visibility.RESTRICTED, List.of("user_carol"));
        stubGate(meta, "user_bob");
        when(postContextRepository.loadPostContext(eq("post_1"), eq("user_bob"), eq("user_alice")))
                .thenReturn(CompletableFuture.completedFuture(new PostContextItems(
                        meta, profile("user_bob"), null, profile("user_alice"), null)));

        assertThatThrownBy(() -> service.getContext("user_bob", "post_1").join())
                .isInstanceOf(CompletionException.class)
                .hasCauseInstanceOf(PostNotFoundException.class);
    }

    @Test
    void finalTransactionPostControlsVisibilityInsteadOfTheKeyDiscoveryRead() {
        PostMeta discoveryPost = publicPost("post_1", "user_alice");
        PostMeta finalPost = post("post_1", "user_alice", Visibility.PRIVATE, null);
        stubGate(discoveryPost, "user_bob");
        when(postContextRepository.loadPostContext(eq("post_1"), eq("user_bob"), eq("user_alice")))
                .thenReturn(CompletableFuture.completedFuture(new PostContextItems(
                        finalPost, profile("user_bob"), null, profile("user_alice"), null)));

        assertThatThrownBy(() -> service.getContext("user_bob", "post_1").join())
                .isInstanceOf(CompletionException.class)
                .hasCauseInstanceOf(PostNotFoundException.class);
    }

    @Test
    void restrictedPostAllowsListedViewer() {
        PostMeta meta = post("post_1", "user_alice", Visibility.RESTRICTED, List.of("user_bob"));
        stubGate(meta, "user_bob");
        when(postContextRepository.loadPostContext(eq("post_1"), eq("user_bob"), eq("user_alice")))
                .thenReturn(CompletableFuture.completedFuture(new PostContextItems(
                        meta, profile("user_bob"), null, profile("user_alice"), null)));

        PostContextResponse response = service.getContext("user_bob", "post_1").join();

        assertThat(response.post().visibility()).isEqualTo("RESTRICTED");
        assertThat(response.post().allowedViewerUserIds()).containsExactly("user_bob");
    }

    @Test
    void getContext_whenPostDisappearsBetweenReads_raisesPostNotFound() {
        PostMeta discoveryPost = publicPost("post_1", "user_alice");
        stubGate(discoveryPost, "user_bob");
        when(postContextRepository.loadPostContext(eq("post_1"), eq("user_bob"), eq("user_alice")))
                .thenReturn(CompletableFuture.completedFuture(new PostContextItems(
                        null, profile("user_bob"), null, profile("user_alice"), null)));

        assertThatThrownBy(() -> service.getContext("user_bob", "post_1").join())
                .isInstanceOf(CompletionException.class)
                .hasCauseInstanceOf(PostNotFoundException.class);
    }

    @Test
    void authorMayReadOwnPrivatePost() {
        PostMeta meta = post("post_1", "user_alice", Visibility.PRIVATE, null);
        stubGate(meta, "user_alice");
        when(postContextRepository.loadPostContext(eq("post_1"), eq("user_alice"), eq("user_alice")))
                .thenReturn(CompletableFuture.completedFuture(new PostContextItems(
                        meta, profile("user_alice"), null, profile("user_alice"), null)));

        PostContextResponse response = service.getContext("user_alice", "post_1").join();

        assertThat(response.post().visibility()).isEqualTo("PRIVATE");
        assertThat(response.isFollowing()).isFalse();
    }

    private void stubGate(PostMeta meta, String viewerId) {
        when(contentRepository.getPostMeta(eq(meta.getPostId())))
                .thenReturn(CompletableFuture.completedFuture(meta));
    }

    private static PostMeta publicPost(String postId, String authorId) {
        return post(postId, authorId, Visibility.PUBLIC, null);
    }

    private static PostMeta withLikeCount(PostMeta base, Long likeCount) {
        PostMeta meta = post(base.getPostId(), base.getAuthorId(),
                Visibility.valueOf(base.getVisibility()), base.getAllowedViewerUserIds());
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
        meta.setText("Hello followers");
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

    private static Like like(String postId, String userId) {
        Like like = new Like();
        like.setPk(Like.PK_PREFIX + postId);
        like.setSk(Like.sortKey(userId));
        like.setEntityType(Like.ENTITY_TYPE);
        like.setPostId(postId);
        like.setUserId(userId);
        like.setCreatedAt("2026-05-27T11:05:00Z");
        return like;
    }

    private static FollowingEdge followingEdge(String followerId, String followeeId) {
        FollowingEdge edge = new FollowingEdge();
        edge.setPk(FollowingEdge.PK_PREFIX + followerId);
        edge.setSk(FollowingEdge.sortKey(followeeId));
        edge.setEntityType(FollowingEdge.ENTITY_TYPE);
        edge.setFollowerId(followerId);
        edge.setFolloweeId(followeeId);
        edge.setCreatedAt("2026-05-27T09:00:00Z");
        return edge;
    }
}
