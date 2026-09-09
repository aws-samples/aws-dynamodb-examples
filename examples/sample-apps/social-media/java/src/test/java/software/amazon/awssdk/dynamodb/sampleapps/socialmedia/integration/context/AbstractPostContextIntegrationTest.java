package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.integration.context;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;

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

/**
 *  post-context integration tests booting the full web application against DynamoDB Local and
 * an S3-compatible container.
 *
 * <p>The same scenarios run for every {@code dynamodb.client-type} via the concrete subclasses so
 * both access styles read an identical snapshot with the multi-table {@code TransactGetItems} and produce
 * identical HTTP outcomes. Single DynamoDB Local and S3-compatible containers are shared across the
 * client-type subclasses (singleton pattern) and the streams poller is disabled so it does not race
 * these HTTP-only tests. Every test uses freshly generated ids so the
 * two client-type runs never collide in the shared container.
 */
abstract class AbstractPostContextIntegrationTest {

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
    void permittedViewerReturns200WithBundledSnapshot() {
        String author = createUser();
        String viewer = createUser();
        follow(viewer, author);
        String postId = publishPublicPost(author);
        like(viewer, postId);

        ResponseEntity<ContextBody> response = context(viewer, postId, ContextBody.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().post().postId()).isEqualTo(postId);
        assertThat(response.getBody().post().authorId()).isEqualTo(author);
        assertThat(response.getBody().post().likeCount()).isEqualTo(1L);
        assertThat(response.getBody().author().userId()).isEqualTo(author);
        assertThat(response.getBody().isFollowing()).isTrue();
        assertThat(response.getBody().likedByViewer()).isTrue();
    }

    @Test
    void missingEdgesSurfaceAsFalse() {
        String author = createUser();
        String viewer = createUser();
        String postId = publishPublicPost(author);

        ResponseEntity<ContextBody> response = context(viewer, postId, ContextBody.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().isFollowing()).isFalse();
        assertThat(response.getBody().likedByViewer()).isFalse();
    }

    @Test
    void authorReadsOwnPostWithoutFollowingSelf() {
        String author = createUser();
        String postId = publishPublicPost(author);

        ResponseEntity<ContextBody> response = context(author, postId, ContextBody.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().author().userId()).isEqualTo(author);
        assertThat(response.getBody().isFollowing()).isFalse();
    }

    @Test
    void mediaContextReturnsPresignedUrlThatResolves() {
        String author = createUser();

        MediaUploadBody upload = createMediaUpload(author, "IMAGE", "image/jpeg");
        uploadBytes(upload.uploadUrl(), "image/jpeg", "fake-image-bytes".getBytes(StandardCharsets.UTF_8));
        String postId = publishPost(author,
                "{\"text\":\"With a photo\",\"visibility\":\"PUBLIC\",\"media\":[{\"mediaId\":\""
                        + upload.mediaId() + "\",\"kind\":\"IMAGE\",\"contentType\":\"image/jpeg\"}]}");

        ResponseEntity<ContextBody> response = context(createUser(), postId, ContextBody.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().post().media()).hasSize(1);
        MediaBody media = response.getBody().post().media().get(0);
        assertThat(media.mediaId()).isEqualTo(upload.mediaId());
        assertThat(media.url()).contains("X-Amz-");
        assertThat(download(media.url())).isEqualTo("fake-image-bytes");
    }

    @Test
    void missingActorReturns400ValidationError() {
        String postId = publishPublicPost(createUser());

        HttpHeaders headers = new HttpHeaders();
        ResponseEntity<ErrorBody> response = restTemplate.exchange(
                contextUrl(postId), HttpMethod.GET, new HttpEntity<>(headers), ErrorBody.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().error()).isEqualTo("VALIDATION_ERROR");
    }

    @Test
    void malformedPostIdReturns400ValidationError() {
        HttpHeaders headers = new HttpHeaders();
        headers.add(ACTOR_HEADER, createUser());
        ResponseEntity<ErrorBody> response = restTemplate.exchange(
                "http://localhost:" + port + "/api/v1/posts/bad$id/context",
                HttpMethod.GET, new HttpEntity<>(headers), ErrorBody.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().error()).isEqualTo("VALIDATION_ERROR");
    }

    @Test
    void unknownPostReturns404PostNotFound() {
        ResponseEntity<ErrorBody> response = context(createUser(), "post_missing", ErrorBody.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().error()).isEqualTo("POST_NOT_FOUND");
    }

    @Test
    void unknownViewerReturns404UserNotFound() {
        String postId = publishPublicPost(createUser());

        ResponseEntity<ErrorBody> response = context(uniqueUserId(), postId, ErrorBody.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().error()).isEqualTo("USER_NOT_FOUND");
    }

    @Test
    void privatePostHiddenFromNonAuthorReturns404PostNotFound() {
        String author = createUser();
        String viewer = createUser();
        String postId = publishPost(author, "{\"text\":\"Only me\",\"visibility\":\"PRIVATE\"}");

        ResponseEntity<ErrorBody> response = context(viewer, postId, ErrorBody.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().error()).isEqualTo("POST_NOT_FOUND");
    }

    @Test
    void authorMayReadOwnPrivatePost() {
        String author = createUser();
        String postId = publishPost(author, "{\"text\":\"Only me\",\"visibility\":\"PRIVATE\"}");

        ResponseEntity<ContextBody> response = context(author, postId, ContextBody.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().post().visibility()).isEqualTo("PRIVATE");
    }

    @Test
    void restrictedPostAllowsListedViewerAndHidesOthers() {
        String author = createUser();
        String allowed = createUser();
        String outsider = createUser();
        String postId = publishPost(author,
                "{\"text\":\"Just for you\",\"visibility\":\"RESTRICTED\",\"allowedViewerUserIds\":[\""
                        + allowed + "\"]}");

        ResponseEntity<ContextBody> permitted = context(allowed, postId, ContextBody.class);
        assertThat(permitted.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(permitted.getBody().post().allowedViewerUserIds()).containsExactly(allowed);

        ResponseEntity<ErrorBody> hidden = context(outsider, postId, ErrorBody.class);
        assertThat(hidden.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(hidden.getBody().error()).isEqualTo("POST_NOT_FOUND");
    }

    private <T> ResponseEntity<T> context(String actor, String postId, Class<T> responseType) {
        HttpHeaders headers = new HttpHeaders();
        headers.add(ACTOR_HEADER, actor);
        return restTemplate.exchange(
                contextUrl(postId), HttpMethod.GET, new HttpEntity<>(headers), responseType);
    }

    private void like(String actor, String postId) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.add(ACTOR_HEADER, actor);
        ResponseEntity<String> liked = restTemplate.exchange(
                "http://localhost:" + port + "/api/v1/posts/" + postId + "/likes",
                HttpMethod.POST, new HttpEntity<>(headers), String.class);
        assertThat(liked.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    private String publishPublicPost(String author) {
        return publishPost(author, "{\"text\":\"Hello followers\",\"visibility\":\"PUBLIC\"}");
    }

    private String publishPost(String author, String body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.add(ACTOR_HEADER, author);
        ResponseEntity<PublishBody> published = restTemplate.exchange(
                "http://localhost:" + port + "/api/v1/posts",
                HttpMethod.POST, new HttpEntity<>(body, headers), PublishBody.class);
        assertThat(published.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(published.getBody()).isNotNull();
        return published.getBody().postId();
    }

    private MediaUploadBody createMediaUpload(String actor, String kind, String contentType) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.add(ACTOR_HEADER, actor);
        ResponseEntity<MediaUploadBody> response = restTemplate.exchange(
                "http://localhost:" + port + "/api/v1/media", HttpMethod.POST,
                new HttpEntity<>("{\"kind\":\"" + kind + "\",\"contentType\":\"" + contentType + "\"}", headers),
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

    private String createUser() {
        String userId = uniqueUserId();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        String json = "{\"userId\":\"" + userId + "\",\"displayName\":\"" + userId + "\"}";
        ResponseEntity<String> created = restTemplate.postForEntity(
                "http://localhost:" + port + "/api/v1/users", new HttpEntity<>(json, headers), String.class);
        assertThat(created.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        return userId;
    }

    private void follow(String actor, String targetUserId) {
        HttpHeaders headers = new HttpHeaders();
        headers.add(ACTOR_HEADER, actor);
        ResponseEntity<String> followed = restTemplate.exchange(
                "http://localhost:" + port + "/api/v1/users/" + targetUserId + "/follows",
                HttpMethod.POST, new HttpEntity<>(headers), String.class);
        assertThat(followed.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    private String contextUrl(String postId) {
        return "http://localhost:" + port + "/api/v1/posts/" + postId + "/context";
    }

    private static String uniqueUserId() {
        return "user_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
    }

    /** Minimal view of the context success body. */
    record ContextBody(PostBody post, AuthorBody author, boolean isFollowing, boolean likedByViewer) {
    }

    /** Minimal view of the post summary. */
    record PostBody(String postId, String authorId, String text, String createdAt, long likeCount,
                    String type, String visibility, List<String> allowedViewerUserIds, List<MediaBody> media) {
    }

    /** Minimal view of the author summary. */
    record AuthorBody(String userId, String displayName) {
    }

    /** Minimal view of a media element in the post summary. */
    record MediaBody(String mediaId, String kind, String contentType, String url) {
    }

    /** Minimal view of the publish success body. */
    record PublishBody(String postId) {
    }

    /** Minimal view of the media upload body. */
    record MediaUploadBody(String mediaId, String uploadUrl, String uploadMethod, String expiresAt) {
    }

    /** Minimal view of the error envelope. */
    record ErrorBody(String error, String message) {
    }
}
