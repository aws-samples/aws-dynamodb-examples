package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.integration.post;

import static org.assertj.core.api.Assertions.assertThat;

import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Proxy;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.atomic.AtomicBoolean;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.wait.strategy.Wait;
import org.testcontainers.utility.DockerImageName;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.config.MediaProperties;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.config.TimelineFanoutMode;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto.PublishPostRequest;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto.PublishPostResponse;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.mapper.PostMapper;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.PostMeta;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.TimelineEntry;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.ContentRepository;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.HighLevelDynamoDbContentRepository;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.HighLevelDynamoDbTimelineRepository;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.LowLevelDynamoDbContentRepository;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.LowLevelDynamoDbTimelineRepository;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.TimelinePage;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.TimelineRepository;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.UserGraphRepository;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.service.MediaValidator;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.service.PostService;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.service.S3MediaGateway;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.service.TimelineFanoutService;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbEnhancedAsyncClient;
import software.amazon.awssdk.services.dynamodb.DynamoDbAsyncClient;

/**
 *  publish-and-fan-out and  ephemeral-expiring content integration tests booting the full web
 * application against DynamoDB Local and an S3-compatible container.
 *
 * <p>The same scenarios run for every {@code dynamodb.client-type} via the concrete subclasses so
 * both access styles write identical rows, materialize identical timelines, and produce identical
 * HTTP outcomes. Single DynamoDB Local and S3-compatible containers are shared across the client-type
 * subclasses (singleton pattern) and the streams poller is disabled so it does not race these
 * HTTP-only tests.
 *
 * <p>expiring items reuse the publish path with a numeric {@code expiresAt} TTL, hold at most one
 * attachment, and are never copied to follower timelines.
 *
 * <p>The S3-compatible container is configured with the same fake credentials the app injects for a
 * local endpoint, so the standard S3 API path (presigned {@code PUT}, {@code HEAD}, presigned
 * {@code GET}) exercises the real object store. The media flow is identical on any S3-compatible
 * backend.
 */
abstract class AbstractPublishPostIntegrationTest {

private static final int DYNAMODB_PORT = 8000;

private static final int S3_PORT = 9000;

private static final String FAKE_ACCESS_KEY = "fakeAccessKey";

private static final String FAKE_SECRET_KEY = "fakeSecretKey";

private static final String ACTOR_HEADER = "X-User-Id";

static final GenericContainer<?> DYNAMODB =
            new GenericContainer<>(DockerImageName.parse("amazon/dynamodb-local:latest"))
                    .withExposedPorts(DYNAMODB_PORT);

static final GenericContainer<?> S3 =
            new GenericContainer<>(DockerImageName.parse("minio/minio:latest"))
                    .withExposedPorts(S3_PORT)
                    .withEnv("MINIO_ROOT_USER", FAKE_ACCESS_KEY)
                    .withEnv("MINIO_ROOT_PASSWORD", FAKE_SECRET_KEY)
                    .withCommand("server", "/data")
                    .waitingFor(Wait.forHttp("/minio/health/ready").forPort(S3_PORT));

    static {
        DYNAMODB.start();
        S3.start();
    }

    @LocalServerPort
    private int port;

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private TimelineRepository timelineRepository;

    @Autowired
    private ContentRepository contentRepository;

    @Autowired
    private DynamoDbAsyncClient dynamoDbClient;

    @Autowired
    private UserGraphRepository userGraphRepository;

    @Autowired
    private MediaProperties mediaProperties;

    @Autowired
    private S3MediaGateway s3MediaGateway;

    /**
     * Points the application at the shared containers, enables resource creation, and disables the
     * streams poller for these HTTP-only tests.
     *
     * @param registry dynamic property registry
     */
    @DynamicPropertySource
    static void configure(DynamicPropertyRegistry registry) {
        registry.add("dynamodb.endpoint",
                () -> "http://" + DYNAMODB.getHost() + ":" + DYNAMODB.getMappedPort(DYNAMODB_PORT));
        registry.add("dynamodb.create-resources", () -> "true");
        registry.add("dynamodb.streams.enabled", () -> "false");
        registry.add("s3.endpoint", () -> "http://" + S3.getHost() + ":" + S3.getMappedPort(S3_PORT));
        registry.add("s3.path-style", () -> "true");
    }

    @Test
    void validPublicPostReturns201AndFansOutToFollowers() {
        String author = createUser();
        String followerOne = createUser();
        String followerTwo = createUser();
        follow(followerOne, author);
        follow(followerTwo, author);

        ResponseEntity<PublishBody> response = publish(author,
                "{\"text\":\"Hello followers\",\"visibility\":\"PUBLIC\"}", PublishBody.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().authorId()).isEqualTo(author);
        assertThat(response.getBody().visibility()).isEqualTo("PUBLIC");
        assertThat(response.getBody().likeCount()).isZero();
        assertThat(response.getBody().media()).isNull();

        String postId = response.getBody().postId();
        assertThat(timelinePostIds(followerOne)).contains(postId);
        assertThat(timelinePostIds(followerTwo)).contains(postId);
    }

    @Test
    void publicPostFansOutBeyondOneBatch() {
        String author = createUser();
        List<String> followers = new ArrayList<>();
        for (int i = 0; i < 27; i++) {
            String follower = createUser();
            follow(follower, author);
            followers.add(follower);
        }

        ResponseEntity<PublishBody> response = publish(author,
                "{\"text\":\"Big fan-out\",\"visibility\":\"PUBLIC\"}", PublishBody.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);

        String postId = response.getBody().postId();
        for (String follower : followers) {
            assertThat(timelinePostIds(follower)).contains(postId);
        }
    }

    @Test
    void restrictedPostFansOutToAllowListOnly() {
        String author = createUser();
        String allowed = createUser();
        String follower = createUser();
        follow(follower, author);

        ResponseEntity<PublishBody> response = publish(author,
                "{\"text\":\"Just for you\",\"visibility\":\"RESTRICTED\",\"allowedViewerUserIds\":[\""
                        + allowed + "\"]}", PublishBody.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody().allowedViewerUserIds()).containsExactly(allowed);

        String postId = response.getBody().postId();
        assertThat(timelinePostIds(allowed)).contains(postId);
        assertThat(timelinePostIds(follower)).doesNotContain(postId);
    }

    @Test
    void replayableRestrictedPost_returnsOriginalPostAndRejectsDifferentReuse() {
        String author = createUser();
        String allowed = createUser();
        String clientRequestId = uniqueClientRequestId("post_replay");
        String body = "{\"text\":\"Just for you\",\"visibility\":\"RESTRICTED\",\"clientRequestId\":\""
                + clientRequestId + "\",\"allowedViewerUserIds\":[\"" + allowed + "\"]}";

        ResponseEntity<PublishBody> created = publish(author, body, PublishBody.class);
        ResponseEntity<PublishBody> replayed = publish(author, body, PublishBody.class);
        ResponseEntity<ErrorBody> conflict = publish(author,
                "{\"text\":\"Changed\",\"visibility\":\"RESTRICTED\",\"clientRequestId\":\""
                        + clientRequestId + "\",\"allowedViewerUserIds\":[\"" + allowed + "\"]}",
                ErrorBody.class);

        assertThat(created.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(replayed.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(replayed.getBody().postId()).isEqualTo(created.getBody().postId());
        assertThat(timelinePostIds(allowed)).containsExactly(created.getBody().postId());
        assertThat(conflict.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(conflict.getBody().error()).isEqualTo("VALIDATION_ERROR");
    }

    @Test
    void privatePostReturns201WithNoFanOut() {
        String author = createUser();
        String follower = createUser();
        follow(follower, author);

        ResponseEntity<PublishBody> response = publish(author,
                "{\"text\":\"Only me\",\"visibility\":\"PRIVATE\"}", PublishBody.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(timelinePostIds(follower)).doesNotContain(response.getBody().postId());
    }

    @Test
    void mediaRoundTripPublishReturnsPresignedUrl() {
        String author = createUser();

        MediaUploadBody upload = createMediaUpload(author, "IMAGE", "image/jpeg");
        uploadBytes(upload.uploadUrl(), "image/jpeg", "fake-image-bytes".getBytes(StandardCharsets.UTF_8));

        ResponseEntity<PublishBody> response = publish(author,
                "{\"text\":\"With a photo\",\"visibility\":\"PUBLIC\",\"media\":[{\"mediaId\":\""
                        + upload.mediaId() + "\",\"kind\":\"IMAGE\",\"contentType\":\"image/jpeg\"}]}",
                PublishBody.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody().media()).hasSize(1);
        MediaBody media = response.getBody().media().get(0);
        assertThat(media.mediaId()).isEqualTo(upload.mediaId());
        assertThat(media.url()).contains("X-Amz-");

        // The presigned GET URL resolves the uploaded bytes.
        assertThat(download(media.url())).isEqualTo("fake-image-bytes");
    }

    @Test
    void replayableMediaPost_returnsOriginalPost() {
        String author = createUser();
        MediaUploadBody upload = createMediaUpload(author, "IMAGE", "image/jpeg");
        uploadBytes(upload.uploadUrl(), "image/jpeg", "replay-image".getBytes(StandardCharsets.UTF_8));
        String clientRequestId = uniqueClientRequestId("post_media_replay");
        String body = "{\"text\":\"With a photo\",\"visibility\":\"PRIVATE\",\"clientRequestId\":\""
                + clientRequestId + "\",\"media\":[{\"mediaId\":\"" + upload.mediaId()
                + "\",\"kind\":\"IMAGE\",\"contentType\":\"image/jpeg\"}]}";

        ResponseEntity<PublishBody> created = publish(author, body, PublishBody.class);
        ResponseEntity<PublishBody> replayed = publish(author, body, PublishBody.class);

        assertThat(created.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(replayed.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(replayed.getBody().postId()).isEqualTo(created.getBody().postId());
        assertThat(replayed.getBody().media()).hasSize(1);
    }

    @Test
    void publication_withPostCommitFailures_recoversSourceAndTimelineForBothRepositoryModes() {
        String author = createUser();
        String follower = createUser();
        follow(follower, author);

        verifySourceRecovery(new LowLevelDynamoDbContentRepository(
                failAfterCommit("transactWriteItems"), "JavaContent"), author, follower, "low");
        verifySourceRecovery(new HighLevelDynamoDbContentRepository(DynamoDbEnhancedAsyncClient.builder()
                .dynamoDbClient(failAfterCommit("transactWriteItems")).build(), "JavaContent"),
                author, follower, "high");

        verifyTimelineRecovery(new LowLevelDynamoDbContentRepository(dynamoDbClient, "JavaContent"),
                new LowLevelDynamoDbTimelineRepository(dynamoDbClient, "JavaTimelines"), author, follower, "low");
        DynamoDbEnhancedAsyncClient enhanced = DynamoDbEnhancedAsyncClient.builder()
                .dynamoDbClient(dynamoDbClient).build();
        verifyTimelineRecovery(new HighLevelDynamoDbContentRepository(enhanced, "JavaContent"),
                new HighLevelDynamoDbTimelineRepository(enhanced, "JavaTimelines"), author, follower, "high");
    }

    @Test
    void createMediaReturns200WithUploadUrlAndExpiry() {
        String author = createUser();

        ResponseEntity<MediaUploadBody> response = restTemplate.exchange(
                url("/api/v1/media"), HttpMethod.POST,
                jsonEntity(author, "{\"kind\":\"IMAGE\",\"contentType\":\"image/png\",\"sizeBytes\":482310}"),
                MediaUploadBody.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().mediaId()).startsWith("media_");
        assertThat(response.getBody().uploadUrl()).contains("X-Amz-");
        assertThat(response.getBody().uploadMethod()).isEqualTo("PUT");
        assertThat(response.getBody().expiresAt()).endsWith("Z");
    }

    @Test
    void missingActorReturns400ValidationError() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        ResponseEntity<ErrorBody> response = restTemplate.exchange(
                url("/api/v1/posts"), HttpMethod.POST,
                new HttpEntity<>("{\"text\":\"hi\",\"visibility\":\"PUBLIC\"}", headers), ErrorBody.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().error()).isEqualTo("VALIDATION_ERROR");
    }

    @Test
    void unknownAuthorReturns404UserNotFound() {
        ResponseEntity<ErrorBody> response = publish(uniqueUserId(),
                "{\"text\":\"hi\",\"visibility\":\"PUBLIC\"}", ErrorBody.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody().error()).isEqualTo("USER_NOT_FOUND");
    }

    @Test
    void invalidVisibilityReturns400InvalidVisibility() {
        String author = createUser();

        ResponseEntity<ErrorBody> response = publish(author,
                "{\"text\":\"hi\",\"visibility\":\"SECRET\"}", ErrorBody.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().error()).isEqualTo("INVALID_VISIBILITY");
    }

    @Test
    void restrictedUnknownViewerReturns404UserNotFound() {
        String author = createUser();

        ResponseEntity<ErrorBody> response = publish(author,
                "{\"text\":\"hi\",\"visibility\":\"RESTRICTED\",\"allowedViewerUserIds\":[\""
                        + uniqueUserId() + "\"]}", ErrorBody.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody().error()).isEqualTo("USER_NOT_FOUND");
    }

    @Test
    void mediaNotUploadedReturns404MediaNotFound() {
        String author = createUser();

        ResponseEntity<ErrorBody> response = publish(author,
                "{\"visibility\":\"PUBLIC\",\"media\":[{\"mediaId\":\"media_missing\",\"kind\":\"IMAGE\","
                        + "\"contentType\":\"image/jpeg\"}]}", ErrorBody.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody().error()).isEqualTo("MEDIA_NOT_FOUND");
    }

    @Test
    void invalidMediaContentTypeReturns400InvalidMedia() {
        String author = createUser();

        ResponseEntity<ErrorBody> response = publish(author,
                "{\"visibility\":\"PUBLIC\",\"media\":[{\"mediaId\":\"media_x\",\"kind\":\"IMAGE\","
                        + "\"contentType\":\"image/tiff\"}]}", ErrorBody.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().error()).isEqualTo("INVALID_MEDIA");
    }

    @Test
    void emptyPostReturns400ValidationError() {
        String author = createUser();

        ResponseEntity<ErrorBody> response = publish(author,
                "{\"visibility\":\"PUBLIC\"}", ErrorBody.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().error()).isEqualTo("VALIDATION_ERROR");
    }

    @Test
    void validStoryReturns201WithTtlAndNoTimelineFanOut() {
        String author = createUser();
        String follower = createUser();
        follow(follower, author);

        ResponseEntity<PublishBody> response = publish(author,
                "{\"text\":\"On my way\",\"visibility\":\"PUBLIC\",\"type\":\"STORY\"}", PublishBody.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody().type()).isEqualTo("STORY");
        assertThat(response.getBody().expiresAt()).isNotNull().isPositive();

        // The persisted source row carries the numeric TTL attribute.
        PostMeta meta = contentRepository.getPostMeta(response.getBody().postId()).join();
        assertThat(meta.getExpiresAt()).isEqualTo(response.getBody().expiresAt());
        assertThat(meta.getType()).isEqualTo("STORY");

        // expiring items are never copied to follower timelines (S7.d).
        assertThat(timelinePostIds(follower)).doesNotContain(response.getBody().postId());
    }

    @Test
    void restrictedStoryReturns201AndIsNotFannedOut() {
        String author = createUser();
        String viewer = createUser();

        ResponseEntity<PublishBody> response = publish(author,
                "{\"text\":\"peek\",\"visibility\":\"RESTRICTED\",\"type\":\"STORY\",\"allowedViewerUserIds\":[\""
                        + viewer + "\"]}", PublishBody.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody().type()).isEqualTo("STORY");
        assertThat(response.getBody().allowedViewerUserIds()).containsExactly(viewer);
        assertThat(timelinePostIds(viewer)).doesNotContain(response.getBody().postId());
    }

    @Test
    void storyWithSingleVideoRoundTripsAndSetsTtl() {
        String author = createUser();

        MediaUploadBody upload = createMediaUpload(author, "VIDEO", "video/mp4");
        uploadBytes(upload.uploadUrl(), "video/mp4", "fake-video-bytes".getBytes(StandardCharsets.UTF_8));

        ResponseEntity<PublishBody> response = publish(author,
                "{\"text\":\"clip\",\"visibility\":\"PUBLIC\",\"type\":\"STORY\",\"media\":[{\"mediaId\":\""
                        + upload.mediaId() + "\",\"kind\":\"VIDEO\",\"contentType\":\"video/mp4\"}]}",
                PublishBody.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody().expiresAt()).isNotNull().isPositive();
        assertThat(response.getBody().media()).hasSize(1);
        assertThat(download(response.getBody().media().get(0).url())).isEqualTo("fake-video-bytes");
    }

    @Test
    void storyWithMoreThanOneAttachmentReturns400InvalidMedia() {
        String author = createUser();

        ResponseEntity<ErrorBody> response = publish(author,
                "{\"visibility\":\"PUBLIC\",\"type\":\"STORY\",\"media\":[{\"mediaId\":\"m1\",\"kind\":\"IMAGE\","
                        + "\"contentType\":\"image/jpeg\"},{\"mediaId\":\"m2\",\"kind\":\"IMAGE\","
                        + "\"contentType\":\"image/png\"}]}", ErrorBody.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().error()).isEqualTo("INVALID_MEDIA");
    }

    @Test
    void invalidTypeReturns400InvalidPostType() {
        String author = createUser();

        ResponseEntity<ErrorBody> response = publish(author,
                "{\"text\":\"hi\",\"visibility\":\"PUBLIC\",\"type\":\"REEL\"}", ErrorBody.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().error()).isEqualTo("INVALID_POST_TYPE");
    }

    private <T> ResponseEntity<T> publish(String actor, String body, Class<T> responseType) {
        return restTemplate.exchange(url("/api/v1/posts"), HttpMethod.POST, jsonEntity(actor, body), responseType);
    }

    private MediaUploadBody createMediaUpload(String actor, String kind, String contentType) {
        ResponseEntity<MediaUploadBody> response = restTemplate.exchange(
                url("/api/v1/media"), HttpMethod.POST,
                jsonEntity(actor, "{\"kind\":\"" + kind + "\",\"contentType\":\"" + contentType + "\"}"),
                MediaUploadBody.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        return response.getBody();
    }

    private void uploadBytes(String uploadUrl, String contentType, byte[] bytes) {
        try {
            HttpResponse<Void> response = HttpClient.newHttpClient().send(
                    HttpRequest.newBuilder(URI.create(uploadUrl))
                            .header("Content-Type", contentType)
                            .PUT(HttpRequest.BodyPublishers.ofByteArray(bytes))
                            .build(),
                    HttpResponse.BodyHandlers.discarding());
            assertThat(response.statusCode()).isBetween(200, 299);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to upload media bytes", e);
        }
    }

    private String download(String downloadUrl) {
        try {
            HttpResponse<String> response = HttpClient.newHttpClient().send(
                    HttpRequest.newBuilder(URI.create(downloadUrl)).GET().build(),
                    HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            assertThat(response.statusCode()).isBetween(200, 299);
            return response.body();
        } catch (Exception e) {
            throw new IllegalStateException("Failed to download media bytes", e);
        }
    }

    private List<String> timelinePostIds(String recipient) {
        TimelinePage page = timelineRepository.queryTimeline(recipient, 50, false, null).join();
        return page.items().stream().map(TimelineEntry::getPostId).toList();
    }

    /** Verifies a response-loss source transaction is recovered from the durable post row. */
    private void verifySourceRecovery(ContentRepository repository, String author, String follower, String mode) {
        PublishPostResponse response = postService(repository, timelineRepository).publish(author,
                new PublishPostRequest("source recovery " + mode, "PUBLIC", null, null, null,
                        uniqueClientRequestId("post_source_failure_" + mode))).join();

        assertThat(repository.getPostMeta(response.postId()).join()).isNotNull();
        assertThat(timelinePostIds(follower)).contains(response.postId());
    }

    /** Verifies a post-commit timeline failure is repaired from the durable post row. */
    private void verifyTimelineRecovery(ContentRepository repository, TimelineRepository repositoryTimeline,
                                        String author, String follower, String mode) {
        TimelineRepository failingTimeline = failAfterFanOut(repositoryTimeline);
        PublishPostResponse response = postService(repository, failingTimeline).publish(author,
                new PublishPostRequest("timeline recovery " + mode, "PUBLIC", null, null, null,
                        uniqueClientRequestId("post_timeline_failure_" + mode))).join();

        assertThat(repository.getPostMeta(response.postId()).join()).isNotNull();
        assertThat(timelinePostIds(follower)).contains(response.postId());
    }

    /** Builds a publish service using the supplied source and timeline persistence boundaries. */
    private PostService postService(ContentRepository repository, TimelineRepository repositoryTimeline) {
        PostMapper mapper = new PostMapper();
        return new PostService(userGraphRepository, repository,
                new TimelineFanoutService(userGraphRepository, repositoryTimeline, mapper, 25),
                new MediaValidator(mediaProperties), s3MediaGateway, mediaProperties, mapper,
                TimelineFanoutMode.SYNC, 256, 86_400L);
    }

    /** Returns a DynamoDB client that reports one selected operation as failed after its real commit. */
    private DynamoDbAsyncClient failAfterCommit(String operation) {
        AtomicBoolean failed = new AtomicBoolean();
        return (DynamoDbAsyncClient) Proxy.newProxyInstance(getClass().getClassLoader(),
                new Class<?>[]{DynamoDbAsyncClient.class}, (proxy, method, args) -> {
                    try {
                        Object result = method.invoke(dynamoDbClient, args);
                        if (!operation.equals(method.getName()) || !(result instanceof CompletableFuture<?> future)
                                || !failed.compareAndSet(false, true)) {
                            return result;
                        }
                        return future.thenCompose(response -> CompletableFuture.failedFuture(
                                new IllegalStateException("post-commit injected failure")));
                    } catch (InvocationTargetException exception) {
                        throw exception.getCause();
                    }
                });
    }

    /** Returns a timeline repository that reports the first completed fan-out as failed to its caller. */
    private TimelineRepository failAfterFanOut(TimelineRepository delegate) {
        AtomicBoolean failed = new AtomicBoolean();
        return (TimelineRepository) Proxy.newProxyInstance(getClass().getClassLoader(),
                new Class<?>[]{TimelineRepository.class}, (proxy, method, args) -> {
                    try {
                        Object result = method.invoke(delegate, args);
                        if (!"fanOut".equals(method.getName()) || !(result instanceof CompletableFuture<?> future)
                                || !failed.compareAndSet(false, true)) {
                            return result;
                        }
                        return future.thenCompose(response -> CompletableFuture.failedFuture(
                                new IllegalStateException("post-commit injected failure")));
                    } catch (InvocationTargetException exception) {
                        throw exception.getCause();
                    }
                });
    }

    private String createUser() {
        String userId = uniqueUserId();
        String json = "{\"userId\":\"" + userId + "\",\"displayName\":\"" + userId + "\"}";
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        ResponseEntity<String> created = restTemplate.postForEntity(
                url("/api/v1/users"), new HttpEntity<>(json, headers), String.class);
        assertThat(created.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        return userId;
    }

    private void follow(String actor, String targetUserId) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.add(ACTOR_HEADER, actor);
        ResponseEntity<String> followed = restTemplate.exchange(
                url("/api/v1/users/" + targetUserId + "/follows"),
                HttpMethod.POST, new HttpEntity<>(headers), String.class);
        assertThat(followed.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    private HttpEntity<String> jsonEntity(String actor, String body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.add(ACTOR_HEADER, actor);
        return new HttpEntity<>(body, headers);
    }

    private String url(String path) {
        return "http://localhost:" + port + path;
    }

    private static String uniqueUserId() {
        return "user_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
    }

    private static String uniqueClientRequestId(String prefix) {
        return prefix + "_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
    }

    /** Minimal view of the publish success body. */
    record PublishBody(String postId, String authorId, String type, String visibility, String text,
                       long likeCount, Long expiresAt, List<String> allowedViewerUserIds,
                       List<MediaBody> media) {
    }

    /** Minimal view of a media element in the publish body. */
    record MediaBody(String mediaId, String kind, String contentType, String url) {
    }

    /** Minimal view of the media upload body. */
    record MediaUploadBody(String mediaId, String uploadUrl, String uploadMethod, String expiresAt) {
    }

    /** Minimal view of the error envelope. */
    record ErrorBody(String error, String message) {
    }
}
