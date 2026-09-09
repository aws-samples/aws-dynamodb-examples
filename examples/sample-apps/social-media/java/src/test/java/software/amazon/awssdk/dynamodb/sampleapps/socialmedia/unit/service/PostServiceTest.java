package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.unit.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.config.MediaProperties;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.config.TimelineFanoutMode;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto.MediaAttachmentRequest;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto.PublishPostRequest;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto.PublishPostResponse;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.exception.InvalidMediaException;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.exception.InvalidPostTypeException;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.exception.InvalidVisibilityException;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.exception.MediaNotFoundException;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.exception.MissingActorException;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.exception.UserNotFoundException;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.exception.ValidationException;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.mapper.PostMapper;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.FollowerEdge;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.PostMeta;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.TimelineEntry;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.UserPost;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.UserProfile;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.Visibility;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.ContentRepository;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.FollowerQueryResult;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.TimelineRepository;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.UserGraphRepository;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.service.MediaValidator;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.service.PostService;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.service.S3MediaGateway;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.service.TimelineFanoutService;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.util.RequestIdentity;

/**
 * Unit coverage for the operation 3 publish flow and the operation 7 expiring content branch. No
 * Docker or Spring context is required. Repositories and the S3 gateway are mocked so the actor,
 * visibility matrix, media, TTL, and fan-out branches are exercised in isolation. The real mapper,
 * validator, and media properties keep the row and response shapes honest.
 */
@Tag("unit")
@ExtendWith(MockitoExtension.class)
class PostServiceTest {

    private static final String BUCKET = "test-bucket";

    private static final long STORY_TTL_SECONDS = 86_400L;

    @Mock
    private UserGraphRepository userGraphRepository;

    @Mock
    private ContentRepository contentRepository;

    @Mock
    private TimelineRepository timelineRepository;

    @Mock
    private S3MediaGateway s3MediaGateway;

    private PostService service;

    /**
     * Wires the service in {@code SYNC} mode with mocked repositories and a real mapper.
     */
    @BeforeEach
    void setUp() {
        MediaProperties properties = new MediaProperties(
                BUCKET, "media/", 900, 3,
                List.of("image/jpeg", "image/png"), List.of("video/mp4"),
                10_485_760L, 104_857_600L);
        service = new PostService(
                userGraphRepository, contentRepository,
                new TimelineFanoutService(userGraphRepository, timelineRepository, new PostMapper(), 25),
                new MediaValidator(properties), s3MediaGateway, properties,
                new PostMapper(), TimelineFanoutMode.SYNC, 256, STORY_TTL_SECONDS);
    }

    @Test
    void publicPostFansOutToEveryFollower() {
        stubProfile("user_alice");
        when(userGraphRepository.queryFollowers(eq("user_alice")))
                .thenReturn(CompletableFuture.completedFuture(new FollowerQueryResult(
                        List.of(followerEdge("user_bob", "user_alice"), followerEdge("user_carol", "user_alice")))));
        stubPutPost();
        stubFanOut();

        PublishPostResponse response = service.publish("user_alice",
                new PublishPostRequest("Hello followers", "PUBLIC", null, null, null)).join();

        assertThat(response.visibility()).isEqualTo("PUBLIC");
        assertThat(response.authorId()).isEqualTo("user_alice");
        assertThat(response.likeCount()).isZero();
        assertThat(response.media()).isNull();
        assertThat(response.allowedViewerUserIds()).isNull();

        ArgumentCaptor<List<TimelineEntry>> captor = timelineCaptor();
        verify(timelineRepository).fanOut(captor.capture(), eq(25));
        assertThat(captor.getValue()).extracting(TimelineEntry::getTimelineUserId)
                .containsExactlyInAnyOrder("user_bob", "user_carol");
    }

    @Test
    void privatePostWritesSourcesButNoTimeline() {
        stubProfile("user_alice");
        stubPutPost();

        PublishPostResponse response = service.publish("user_alice",
                new PublishPostRequest("Just me", "PRIVATE", null, null, null)).join();

        assertThat(response.visibility()).isEqualTo("PRIVATE");
        verify(contentRepository).putPost(any(PostMeta.class), any(UserPost.class));
        verify(userGraphRepository, never()).queryFollowers(anyString());
        verify(timelineRepository, never()).fanOut(any(), anyInt());
    }

    @Test
    void restrictedPostFansOutToAllowListOnly() {
        stubProfile("user_alice");
        stubProfile("user_bob");
        stubProfile("user_carol");
        stubPutPost();
        stubFanOut();

        PublishPostResponse response = service.publish("user_alice",
                new PublishPostRequest("Team offsite", "RESTRICTED",
                        List.of("user_bob", "user_carol"), null, null)).join();

        assertThat(response.visibility()).isEqualTo("RESTRICTED");
        assertThat(response.allowedViewerUserIds()).containsExactly("user_bob", "user_carol");
        verify(userGraphRepository, never()).queryFollowers(anyString());

        ArgumentCaptor<List<TimelineEntry>> captor = timelineCaptor();
        verify(timelineRepository).fanOut(captor.capture(), eq(25));
        assertThat(captor.getValue()).extracting(TimelineEntry::getTimelineUserId)
                .containsExactlyInAnyOrder("user_bob", "user_carol");
    }

    @Test
    void mediaPostValidatesObjectAndReturnsPresignedUrl() {
        stubProfile("user_alice");
        when(s3MediaGateway.objectSize(eq(BUCKET), anyString()))
                .thenReturn(CompletableFuture.completedFuture(1024L));
        when(s3MediaGateway.presignDownload(eq(BUCKET), anyString()))
                .thenReturn("https://s3.example/test?sig");
        stubPutPost();

        PublishPostResponse response = service.publish("user_alice",
                new PublishPostRequest(null, "PRIVATE", null, null,
                        List.of(new MediaAttachmentRequest("media_1", "IMAGE", "image/jpeg")))).join();

        assertThat(response.media()).hasSize(1);
        assertThat(response.media().get(0).url()).isEqualTo("https://s3.example/test?sig");
        assertThat(response.media().get(0).mediaId()).isEqualTo("media_1");
    }

    @Test
    void blankActorThrowsMissingActor() {
        assertThatThrownBy(() -> service.publish("  ", request("PUBLIC")))
                .isInstanceOf(MissingActorException.class);
    }

    @Test
    void missingVisibilityThrowsInvalidVisibility() {
        assertThatThrownBy(() -> service.publish("user_alice", request(null)))
                .isInstanceOf(InvalidVisibilityException.class);
    }

    @Test
    void unknownVisibilityThrowsInvalidVisibility() {
        assertThatThrownBy(() -> service.publish("user_alice", request("SECRET")))
                .isInstanceOf(InvalidVisibilityException.class);
    }

    @Test
    void restrictedWithoutAllowListThrowsInvalidVisibility() {
        assertThatThrownBy(() -> service.publish("user_alice",
                new PublishPostRequest("hi", "RESTRICTED", null, null, null)))
                .isInstanceOf(InvalidVisibilityException.class);
    }

    @Test
    void allowListOnPublicThrowsInvalidVisibility() {
        assertThatThrownBy(() -> service.publish("user_alice",
                new PublishPostRequest("hi", "PUBLIC", List.of("user_bob"), null, null)))
                .isInstanceOf(InvalidVisibilityException.class);
    }

    @Test
    void authorInAllowListThrowsInvalidVisibility() {
        assertThatThrownBy(() -> service.publish("user_alice",
                new PublishPostRequest("hi", "RESTRICTED", List.of("user_alice"), null, null)))
                .isInstanceOf(InvalidVisibilityException.class);
    }

    @Test
    void duplicateAllowListThrowsInvalidVisibility() {
        assertThatThrownBy(() -> service.publish("user_alice",
                new PublishPostRequest("hi", "RESTRICTED", List.of("user_bob", "user_bob"), null, null)))
                .isInstanceOf(InvalidVisibilityException.class);
    }

    @Test
    void emptyPostThrowsValidationError() {
        assertThatThrownBy(() -> service.publish("user_alice",
                new PublishPostRequest(null, "PUBLIC", null, null, null)))
                .isInstanceOf(ValidationException.class);
    }

    @Test
    void invalidTypeThrowsInvalidPostType() {
        assertThatThrownBy(() -> service.publish("user_alice",
                new PublishPostRequest("hi", "PUBLIC", null, "REEL", null)))
                .isInstanceOf(InvalidPostTypeException.class);
    }

    @Test
    void storyPublishSetsExpiresAtTtlAndSkipsTimeline() {
        stubProfile("user_alice");
        stubPutPost();
        ArgumentCaptor<PostMeta> metaCaptor = ArgumentCaptor.forClass(PostMeta.class);

        long before = Instant.now().getEpochSecond();
        PublishPostResponse response = service.publish("user_alice",
                new PublishPostRequest("On my way", "PUBLIC", null, "STORY", null)).join();
        long after = Instant.now().getEpochSecond();

        assertThat(response.type()).isEqualTo("STORY");
        assertThat(response.likeCount()).isNull();
        assertThat(response.expiresAt())
                .isBetween(before + STORY_TTL_SECONDS, after + STORY_TTL_SECONDS);

        verify(contentRepository).putPost(metaCaptor.capture(), any(UserPost.class));
        assertThat(metaCaptor.getValue().getExpiresAt()).isEqualTo(response.expiresAt());
        assertThat(metaCaptor.getValue().getLikeCount()).isNull();
        verify(userGraphRepository, never()).queryFollowers(anyString());
        verify(timelineRepository, never()).fanOut(any(), anyInt());
    }

    @Test
    void storyRejectsMoreThanOneAttachmentWithInvalidMedia() {
        assertThatThrownBy(() -> service.publish("user_alice",
                new PublishPostRequest("multi", "PUBLIC", null, "STORY",
                        List.of(new MediaAttachmentRequest("m1", "IMAGE", "image/jpeg"),
                                new MediaAttachmentRequest("m2", "IMAGE", "image/png")))))
                .isInstanceOf(InvalidMediaException.class);
    }

    @Test
    void unknownAuthorRaisesUserNotFound() {
        when(userGraphRepository.getProfile(eq("user_ghost")))
                .thenReturn(CompletableFuture.completedFuture(null));

        assertThatThrownBy(() -> service.publish("user_ghost", request("PUBLIC")).join())
                .isInstanceOf(CompletionException.class)
                .hasCauseInstanceOf(UserNotFoundException.class);
    }

    @Test
    void unknownAllowListViewerRaisesUserNotFound() {
        stubProfile("user_alice");
        when(userGraphRepository.getProfile(eq("user_ghost")))
                .thenReturn(CompletableFuture.completedFuture(null));

        assertThatThrownBy(() -> service.publish("user_alice",
                new PublishPostRequest("hi", "RESTRICTED", List.of("user_ghost"), null, null)).join())
                .isInstanceOf(CompletionException.class)
                .hasCauseInstanceOf(UserNotFoundException.class);
    }

    @Test
    void mediaNotUploadedRaisesMediaNotFound() {
        stubProfile("user_alice");
        when(s3MediaGateway.objectSize(eq(BUCKET), anyString()))
                .thenReturn(CompletableFuture.completedFuture(null));

        assertThatThrownBy(() -> service.publish("user_alice",
                new PublishPostRequest(null, "PUBLIC", null, null,
                        List.of(new MediaAttachmentRequest("media_x", "IMAGE", "image/jpeg")))).join())
                .isInstanceOf(CompletionException.class)
                .hasCauseInstanceOf(MediaNotFoundException.class);
    }

    @Test
    void disallowedMediaContentTypeRaisesInvalidMedia() {
        stubProfile("user_alice");

        assertThatThrownBy(() -> service.publish("user_alice",
                new PublishPostRequest(null, "PUBLIC", null, null,
                        List.of(new MediaAttachmentRequest("media_x", "IMAGE", "image/tiff")))).join())
                .isInstanceOf(CompletionException.class)
                .hasCauseInstanceOf(InvalidMediaException.class);
    }

    @Test
    void publishWithSameClientRequestIdReplaysOnePersistedPostAndRepairsFanOut() {
        stubProfile("user_alice");
        stubPutPost();
        when(userGraphRepository.queryFollowers("user_alice")).thenReturn(CompletableFuture.completedFuture(
                new FollowerQueryResult(List.of())));
        when(contentRepository.getPostMeta(anyString())).thenReturn(CompletableFuture.completedFuture(null));
        PublishPostRequest request = new PublishPostRequest(
                "Replayable", "PUBLIC", null, null, null, "request_post_1");

        PublishPostResponse created = service.publish("user_alice", request).join();
        ArgumentCaptor<PostMeta> postCaptor = ArgumentCaptor.forClass(PostMeta.class);
        verify(contentRepository).putPost(postCaptor.capture(), any(UserPost.class));
        when(contentRepository.getPostMeta(created.postId())).thenReturn(
                CompletableFuture.completedFuture(postCaptor.getValue()));

        PublishPostResponse replayed = service.publish("user_alice", request).join();

        assertThat(replayed.postId()).isEqualTo(created.postId());
        verify(contentRepository).putPost(any(PostMeta.class), any(UserPost.class));
        verify(userGraphRepository, times(2)).queryFollowers("user_alice");
    }

    @Test
    void publishWithReusedClientRequestIdAndDifferentContentRejectsRequest() {
        stubProfile("user_alice");
        PostMapper mapper = new PostMapper();
        PostMeta existing = mapper.toPostMeta(
                "post_existing", "user_alice", "POST", Visibility.PUBLIC,
                null, "original", "2026-08-07T00:00:00Z", null, List.of());
        when(contentRepository.getPostMeta(anyString())).thenReturn(CompletableFuture.completedFuture(existing));

        assertThatThrownBy(() -> service.publish("user_alice",
                new PublishPostRequest("changed", "PUBLIC", null, null, null, "request_post_1")).join())
                .isInstanceOf(CompletionException.class)
                .hasCauseInstanceOf(ValidationException.class);
    }

    @Test
    void publishWithRacedReplayableSourceWrite_recoversMatchingPersistedPost() {
        stubProfile("user_alice");
        when(userGraphRepository.queryFollowers("user_alice")).thenReturn(CompletableFuture.completedFuture(
                new FollowerQueryResult(List.of())));
        String fingerprint = RequestIdentity.postFingerprint("user_alice", "POST", "PUBLIC", null,
                "Replayable", List.of());
        PostMeta existing = new PostMapper().toPostMeta("post_existing", "user_alice", "POST", Visibility.PUBLIC,
                null, "Replayable", "2026-08-07T00:00:00Z", null, List.of());
        existing.setRequestFingerprint(fingerprint);
        when(contentRepository.getPostMeta(anyString())).thenReturn(
                CompletableFuture.completedFuture(null), CompletableFuture.completedFuture(existing));
        when(contentRepository.putPost(any(PostMeta.class), any(UserPost.class)))
                .thenReturn(CompletableFuture.failedFuture(new IllegalStateException("raced source write")));

        PublishPostResponse response = service.publish("user_alice",
                new PublishPostRequest("Replayable", "PUBLIC", null, null, null, "request_post_race")).join();

        assertThat(response.postId()).isEqualTo("post_existing");
        verify(contentRepository).putPost(any(PostMeta.class), any(UserPost.class));
        verify(userGraphRepository).queryFollowers("user_alice");
    }

    private static PublishPostRequest request(String visibility) {
        return new PublishPostRequest("Hello followers", visibility, null, null, null);
    }

    private void stubProfile(String userId) {
        when(userGraphRepository.getProfile(eq(userId)))
                .thenReturn(CompletableFuture.completedFuture(profile(userId)));
    }

    private void stubPutPost() {
        when(contentRepository.putPost(any(PostMeta.class), any(UserPost.class)))
                .thenReturn(CompletableFuture.completedFuture(null));
    }

    private void stubFanOut() {
        when(timelineRepository.fanOut(any(), anyInt()))
                .thenReturn(CompletableFuture.completedFuture(null));
    }

    @SuppressWarnings("unchecked")
    private static ArgumentCaptor<List<TimelineEntry>> timelineCaptor() {
        return ArgumentCaptor.forClass(List.class);
    }

    private static UserProfile profile(String userId) {
        UserProfile profile = new UserProfile();
        profile.setUserId(userId);
        profile.setDisplayName(userId);
        profile.setCreatedAt("2026-05-27T10:00:00Z");
        return profile;
    }

    private static FollowerEdge followerEdge(String followerId, String followeeId) {
        FollowerEdge edge = new FollowerEdge();
        edge.setFollowerId(followerId);
        edge.setFolloweeId(followeeId);
        return edge;
    }
}
