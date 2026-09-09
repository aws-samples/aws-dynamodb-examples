package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.smoke;

import static org.assertj.core.api.Assertions.assertThat;

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
import org.testcontainers.utility.DockerImageName;

/**
 * Smoke test covering the post-context critical path end-to-end against a running stack.
 *
 * <p>Boots the full web application against DynamoDB Local, creates two profiles, a follow edge, a
 * public post, and a like, then confirms the snapshot bundles the post, author, follow state, and
 * like state in one payload. The streams poller is disabled so it does not race this HTTP-only check.
 * The post is text-only so the flow does not touch the media store.
 */
@Tag("smoke")
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class PostContextSmokeTest {

    private static final int DYNAMODB_PORT = 8000;

    static final GenericContainer<?> DYNAMODB =
            new GenericContainer<>(DockerImageName.parse("amazon/dynamodb-local:latest"))
                    .withExposedPorts(DYNAMODB_PORT);

    static {
        DYNAMODB.start();
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
    }

    @Test
    void contextCriticalPath() {
        String author = createUser();
        String viewer = createUser();
        follow(viewer, author);
        String postId = publishPublicPost(author);
        like(viewer, postId);

        ResponseEntity<String> context = context(viewer, postId);

        assertThat(context.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(context.getBody()).contains("\"postId\":\"" + postId + "\"");
        assertThat(context.getBody()).contains("\"authorId\":\"" + author + "\"");
        assertThat(context.getBody()).contains("\"isFollowing\":true");
        assertThat(context.getBody()).contains("\"likedByViewer\":true");
    }

    private ResponseEntity<String> context(String actor, String postId) {
        HttpHeaders headers = new HttpHeaders();
        headers.add("X-User-Id", actor);
        return restTemplate.exchange(
                "http://localhost:" + port + "/api/v1/posts/" + postId + "/context",
                HttpMethod.GET, new HttpEntity<>(headers), String.class);
    }

    private void like(String actor, String postId) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.add("X-User-Id", actor);
        ResponseEntity<String> liked = restTemplate.exchange(
                "http://localhost:" + port + "/api/v1/posts/" + postId + "/likes",
                HttpMethod.POST, new HttpEntity<>(headers), String.class);
        assertThat(liked.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    private String publishPublicPost(String author) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.add("X-User-Id", author);
        ResponseEntity<PublishBody> published = restTemplate.exchange(
                "http://localhost:" + port + "/api/v1/posts", HttpMethod.POST,
                new HttpEntity<>("{\"text\":\"Hello followers\",\"visibility\":\"PUBLIC\"}", headers),
                PublishBody.class);
        assertThat(published.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        return published.getBody().postId();
    }

    private void follow(String actor, String targetUserId) {
        HttpHeaders headers = new HttpHeaders();
        headers.add("X-User-Id", actor);
        ResponseEntity<String> followed = restTemplate.exchange(
                "http://localhost:" + port + "/api/v1/users/" + targetUserId + "/follows",
                HttpMethod.POST, new HttpEntity<>(headers), String.class);
        assertThat(followed.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    private String createUser() {
        String userId = "user_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        String json = "{\"userId\":\"" + userId + "\",\"displayName\":\"" + userId + "\"}";
        ResponseEntity<String> created = restTemplate.postForEntity(
                "http://localhost:" + port + "/api/v1/users", new HttpEntity<>(json, headers), String.class);
        assertThat(created.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        return userId;
    }

    /** Minimal view of the publish success body. */
    record PublishBody(String postId) {
    }
}
