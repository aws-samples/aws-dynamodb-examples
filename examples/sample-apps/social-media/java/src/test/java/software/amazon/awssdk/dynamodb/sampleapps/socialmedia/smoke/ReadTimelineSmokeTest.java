package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.smoke;

import static org.assertj.core.api.Assertions.assertThat;

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
import org.testcontainers.utility.DockerImageName;

/**
 * Smoke test covering the read-home-timeline critical path end-to-end against a running stack.
 *
 * <p>Boots the full web application against DynamoDB Local, publishes a couple of public posts so
 * they fan out to a follower, then reads the follower's timeline and confirms newest-first ordering
 * and clean pagination (a {@code nextToken} on the first page, none on the final page). The streams
 * poller is disabled so it does not race this HTTP-only check.
 */
@Tag("smoke")
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class ReadTimelineSmokeTest {

    private static final int DYNAMODB_PORT = 8000;
    private static final String ACTOR_HEADER = "X-User-Id";

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
    void readTimelineCriticalPath() {
        String author = createUser();
        String follower = createUser();
        follow(follower, author);
        String first = publish(author, "first");
        String second = publish(author, "second");

        ResponseEntity<PageBody> firstPage = readTimeline(follower, "?limit=1");
        assertThat(firstPage.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(firstPage.getBody().userId()).isEqualTo(follower);
        assertThat(firstPage.getBody().items()).hasSize(1);
        assertThat(firstPage.getBody().items().get(0).postId()).isEqualTo(second);
        assertThat(firstPage.getBody().nextToken()).isNotBlank();

        ResponseEntity<PageBody> secondPage = readTimeline(follower,
                "?limit=1&nextToken=" + firstPage.getBody().nextToken());
        assertThat(secondPage.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(secondPage.getBody().items()).hasSize(1);
        assertThat(secondPage.getBody().items().get(0).postId()).isEqualTo(first);

        ResponseEntity<PageBody> defaultPage = readTimeline(follower, "");
        assertThat(defaultPage.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(defaultPage.getBody().items()).hasSize(2);
        assertThat(defaultPage.getBody().nextToken()).isNull();

        ResponseEntity<String> rejected = restTemplate.exchange(
                url("/api/v1/timeline/" + follower + "?limit=101"),
                HttpMethod.GET, HttpEntity.EMPTY, String.class);
        assertThat(rejected.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(rejected.getBody()).contains("VALIDATION_ERROR");
    }

    private ResponseEntity<PageBody> readTimeline(String userId, String query) {
        return restTemplate.exchange(url("/api/v1/timeline/" + userId + query),
                HttpMethod.GET, HttpEntity.EMPTY, PageBody.class);
    }

    private String publish(String author, String text) {
        ResponseEntity<PublishBody> response = restTemplate.exchange(
                url("/api/v1/posts"), HttpMethod.POST,
                jsonEntity(author, "{\"text\":\"" + text + "\",\"visibility\":\"PUBLIC\"}"),
                PublishBody.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        return response.getBody().postId();
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

    record PageBody(String userId, List<TimelineItemBody> items, String nextToken) {
    }

    record TimelineItemBody(String postId) {
    }

    record PublishBody(String postId) {
    }
}
