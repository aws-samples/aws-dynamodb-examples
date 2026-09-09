package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.smoke;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import java.util.List;
import java.util.UUID;
import java.util.function.Supplier;

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
 * smoke test covering the ASYNC timeline fan-out critical path end-to-end against a running
 * stack.
 *
 * <p>Boots the full web application with {@code dynamodb.timeline-fanout-mode=ASYNC} and the consumer
 * enabled, publishes a {@code PUBLIC} post, and confirms the consumer materializes the follower home
 * timeline, observable through the operation 4 read endpoint. The consumer polls with {@code TRIM_HORIZON}
 * for deterministic replay.
 */
@Tag("smoke")
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class AsyncTimelineFanoutSmokeTest {

    private static final int DYNAMODB_PORT = 8000;

    private static final String ACTOR_HEADER = "X-User-Id";

    private static final Duration AWAIT_TIMEOUT = Duration.ofSeconds(30);

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
        registry.add("dynamodb.timeline-fanout-mode", () -> "ASYNC");
        registry.add("dynamodb.streams.enabled", () -> "true");
        registry.add("dynamodb.streams.iterator-type", () -> "TRIM_HORIZON");
    }

    @Test
    void asyncPublishFansOutToFollowerTimelineCriticalPath() {
        String author = createUser();
        String follower = createUser();
        follow(follower, author);

        String postId = publishPost(author, "{\"text\":\"Async launch\",\"visibility\":\"PUBLIC\"}");

        await(() -> timelinePostIds(follower).contains(postId),
                "timeline entry " + postId + " for " + follower);
    }

    private List<String> timelinePostIds(String userId) {
        ResponseEntity<TimelineBody> response = restTemplate.exchange(
                url("/api/v1/timeline/" + userId + "?limit=50"), HttpMethod.GET, HttpEntity.EMPTY, TimelineBody.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        if (response.getBody() == null || response.getBody().items() == null) {
            return List.of();
        }
        return response.getBody().items().stream().map(TimelineItemBody::postId).toList();
    }

    private void await(Supplier<Boolean> condition, String description) {
        long deadline = System.nanoTime() + AWAIT_TIMEOUT.toNanos();
        while (System.nanoTime() < deadline) {
            if (condition.get()) {
                return;
            }
            try {
                Thread.sleep(500);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new IllegalStateException("interrupted while waiting", e);
            }
        }
        assertThat(condition.get()).as("timed out awaiting " + description).isTrue();
    }

    private String publishPost(String author, String body) {
        ResponseEntity<PublishBody> response = restTemplate.exchange(
                url("/api/v1/posts"), HttpMethod.POST, jsonEntity(author, body), PublishBody.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        return response.getBody().postId();
    }

    private String createUser() {
        String userId = "user_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        ResponseEntity<String> created = restTemplate.postForEntity(url("/api/v1/users"),
                new HttpEntity<>("{\"userId\":\"" + userId + "\",\"displayName\":\"" + userId + "\"}", headers),
                String.class);
        assertThat(created.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        return userId;
    }

    private void follow(String actor, String targetUserId) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.add(ACTOR_HEADER, actor);
        ResponseEntity<String> followed = restTemplate.exchange(url("/api/v1/users/" + targetUserId + "/follows"),
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

    /** Minimal view of the publish success body. */
    record PublishBody(String postId) {
    }

    /** Minimal view of the timeline page body. */
    record TimelineBody(List<TimelineItemBody> items) {
    }

    /** Minimal view of one timeline entry. */
    record TimelineItemBody(String postId) {
    }
}
