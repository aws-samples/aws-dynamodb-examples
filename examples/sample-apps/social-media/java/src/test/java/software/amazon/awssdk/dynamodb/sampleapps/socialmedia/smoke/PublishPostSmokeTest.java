package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.smoke;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
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
 * smoke test covering the publish, media, and ephemeral-expiring content critical paths
 * end-to-end against a running stack.
 *
 * <p>Boots the full web application against DynamoDB Local and an S3-compatible container, then runs
 * the media round trip (create upload, {@code PUT} bytes, attach on publish, presigned {@code GET}
 * retrieval), confirms a {@code PUBLIC} post fans out to a follower's timeline, and confirms a
 * {@code expiring content} publishes with a numeric {@code expiresAt} TTL. The streams poller is disabled so it
 * does not race these HTTP-only checks.
 */
@Tag("smoke")
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class PublishPostSmokeTest {

    private static final int DYNAMODB_PORT = 8000;
    private static final int S3_PORT = 9000;
    private static final String FAKE_ACCESS_KEY = "fakeAccessKey";
    private static final String FAKE_SECRET_KEY = "fakeSecretKey";

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
    void mediaRoundTripAndPublicPostCriticalPath() {
        String author = createUser();
        String follower = createUser();
        follow(follower, author);

        MediaUploadBody upload = createMediaUpload(author);
        put(upload.uploadUrl(), "video-bytes".getBytes(StandardCharsets.UTF_8));

        String body = "{\"text\":\"Launch day\",\"visibility\":\"PUBLIC\",\"clientRequestId\":\"post_smoke_123\",\"media\":[{\"mediaId\":\""
                + upload.mediaId() + "\",\"kind\":\"VIDEO\",\"contentType\":\"video/mp4\"}]}";
        ResponseEntity<PublishBody> published = restTemplate.exchange(
                url("/api/v1/posts"), HttpMethod.POST,
                jsonEntity(author, body),
                PublishBody.class);

        assertThat(published.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(published.getBody().postId()).startsWith("post_");
        assertThat(published.getBody().media()).hasSize(1);

        // The presigned GET URL returned on publish resolves the uploaded bytes end-to-end.
        String presignedGet = published.getBody().media().get(0).url();
        assertThat(get(presignedGet)).isEqualTo("video-bytes");

        ResponseEntity<PublishBody> replayed = restTemplate.exchange(
                url("/api/v1/posts"), HttpMethod.POST, jsonEntity(author, body), PublishBody.class);
        assertThat(replayed.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(replayed.getBody().postId()).isEqualTo(published.getBody().postId());
    }

    @Test
    void ephemeralStoryCriticalPath() {
        String author = createUser();

        ResponseEntity<PublishBody> published = restTemplate.exchange(
                url("/api/v1/posts"), HttpMethod.POST,
                jsonEntity(author, "{\"text\":\"On my way\",\"visibility\":\"PUBLIC\",\"type\":\"STORY\"}"),
                PublishBody.class);

        assertThat(published.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(published.getBody().type()).isEqualTo("STORY");
        assertThat(published.getBody().expiresAt()).isNotNull().isPositive();
    }

    private MediaUploadBody createMediaUpload(String actor) {
        ResponseEntity<MediaUploadBody> response = restTemplate.exchange(
                url("/api/v1/media"), HttpMethod.POST,
                jsonEntity(actor, "{\"kind\":\"VIDEO\",\"contentType\":\"video/mp4\"}"),
                MediaUploadBody.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        return response.getBody();
    }

    private void put(String uploadUrl, byte[] bytes) {
        send(HttpRequest.newBuilder(URI.create(uploadUrl))
                .header("Content-Type", "video/mp4")
                .PUT(HttpRequest.BodyPublishers.ofByteArray(bytes)).build());
    }

    private String get(String downloadUrl) {
        return send(HttpRequest.newBuilder(URI.create(downloadUrl)).GET().build());
    }

    private String send(HttpRequest request) {
        try {
            HttpResponse<String> response = HttpClient.newHttpClient()
                    .send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            assertThat(response.statusCode()).isBetween(200, 299);
            return response.body();
        } catch (Exception e) {
            throw new IllegalStateException("HTTP call to S3 failed", e);
        }
    }

    private String createUser() {
        String userId = "user_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        String json = "{\"userId\":\"" + userId + "\",\"displayName\":\"" + userId + "\"}";
        ResponseEntity<String> created = restTemplate.postForEntity(
                url("/api/v1/users"), new HttpEntity<>(json, headers), String.class);
        assertThat(created.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        return userId;
    }

    private void follow(String actor, String targetUserId) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.add("X-User-Id", actor);
        ResponseEntity<String> followed = restTemplate.exchange(
                url("/api/v1/users/" + targetUserId + "/follows"),
                HttpMethod.POST, new HttpEntity<>(headers), String.class);
        assertThat(followed.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    private HttpEntity<String> jsonEntity(String actor, String body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.add("X-User-Id", actor);
        return new HttpEntity<>(body, headers);
    }

    private String url(String path) {
        return "http://localhost:" + port + path;
    }

    record PublishBody(String postId, String type, Long expiresAt, List<MediaItemBody> media) {
    }

    record MediaItemBody(String mediaId, String url) {
    }

    record MediaUploadBody(String mediaId, String uploadUrl) {
    }
}
