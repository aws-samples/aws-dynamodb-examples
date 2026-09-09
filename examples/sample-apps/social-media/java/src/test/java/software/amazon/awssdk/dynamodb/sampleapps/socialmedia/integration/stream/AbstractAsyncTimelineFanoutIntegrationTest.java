package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.integration.stream;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import java.util.List;
import java.util.UUID;
import java.util.function.Supplier;

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
import org.testcontainers.utility.DockerImageName;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.TimelineEntry;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.TimelinePage;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.TimelineRepository;

/**
 *  ASYNC timeline fan-out integration tests booting the full web application with
 * {@code dynamodb.timeline-fanout-mode=ASYNC} and the in-process consumer enabled.
 *
 * <p>In ASYNC mode the publish request returns after the two source writes and the stream consumer
 * materializes the timeline copies from the {@code POST_META} insert. These tests confirm the consumer
 * produces the same visibility-scoped timelines a SYNC publish would: {@code PUBLIC} reaches every
 * follower, {@code RESTRICTED} reaches only the allow list, and {@code PRIVATE} reaches nobody. The
 * same scenarios run for every {@code dynamodb.client-type} via the concrete subclasses. The consumer
 * polls with {@code TRIM_HORIZON} for deterministic replay.
 */
abstract class AbstractAsyncTimelineFanoutIntegrationTest {

private static final int DYNAMODB_PORT = 8000;

private static final String ACTOR_HEADER = "X-User-Id";

private static final Duration AWAIT_TIMEOUT = Duration.ofSeconds(30);

private static final Duration NEGATIVE_WINDOW = Duration.ofSeconds(8);

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

    @Autowired
    private TimelineRepository timelineRepository;

    /**
     * Points the application at the shared container, enables resource creation, defers timeline
     * fan-out to the consumer, and reads the stream from its oldest surviving record.
     *
     * @param registry dynamic property registry
     */
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
    void publicPostIsFannedOutToFollowersByConsumer() {
        String author = createUser();
        String followerOne = createUser();
        String followerTwo = createUser();
        follow(followerOne, author);
        follow(followerTwo, author);

        String postId = publishPost(author, "{\"text\":\"Async hello\",\"visibility\":\"PUBLIC\"}");

        awaitTimelineEntry(followerOne, postId);
        awaitTimelineEntry(followerTwo, postId);

        // The consumer-materialized entry carries the same denormalized fields a SYNC publish writes.
        TimelineEntry entry = timelineEntry(followerOne, postId);
        assertThat(entry.getAuthorId()).isEqualTo(author);
        assertThat(entry.getText()).isEqualTo("Async hello");
        assertThat(entry.getVisibility()).isEqualTo("PUBLIC");
    }

    @Test
    void restrictedPostIsFannedOutToAllowListOnlyByConsumer() {
        String author = createUser();
        String allowed = createUser();
        String follower = createUser();
        follow(follower, author);

        String postId = publishPost(author,
                "{\"text\":\"Async restricted\",\"visibility\":\"RESTRICTED\",\"allowedViewerUserIds\":[\""
                        + allowed + "\"]}");

        awaitTimelineEntry(allowed, postId);
        sleep(NEGATIVE_WINDOW);
        assertThat(timelinePostIds(follower)).doesNotContain(postId);
    }

    @Test
    void privatePostIsNeverFannedOut() {
        String author = createUser();
        String follower = createUser();
        follow(follower, author);

        String postId = publishPost(author, "{\"text\":\"Async private\",\"visibility\":\"PRIVATE\"}");

        sleep(NEGATIVE_WINDOW);
        assertThat(timelinePostIds(follower)).doesNotContain(postId);
    }

    private void awaitTimelineEntry(String recipient, String postId) {
        await(() -> timelinePostIds(recipient).contains(postId),
                "timeline entry " + postId + " for " + recipient);
    }

    private TimelineEntry timelineEntry(String recipient, String postId) {
        return timelinePage(recipient).items().stream()
                .filter(entry -> postId.equals(entry.getPostId()))
                .findFirst()
                .orElseThrow();
    }

    private List<String> timelinePostIds(String recipient) {
        return timelinePage(recipient).items().stream().map(TimelineEntry::getPostId).toList();
    }

    private TimelinePage timelinePage(String recipient) {
        return timelineRepository.queryTimeline(recipient, 50, false, null).join();
    }

    private void await(Supplier<Boolean> condition, String description) {
        long deadline = System.nanoTime() + AWAIT_TIMEOUT.toNanos();
        while (System.nanoTime() < deadline) {
            if (condition.get()) {
                return;
            }
            sleep(Duration.ofMillis(500));
        }
        assertThat(condition.get()).as("timed out awaiting " + description).isTrue();
    }

    private void sleep(Duration duration) {
        try {
            Thread.sleep(duration.toMillis());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("interrupted while waiting", e);
        }
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
}
