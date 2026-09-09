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
 * Smoke coverage for {@code PUBLIC} publish when follower enumeration hits the configured cap.
 *
 * <p>Boots the full web application against DynamoDB Local with {@code dynamodb.follower-fanout-cap=2}
 * and three followers. Publish still returns {@code 201}. The first two followers in sort-key order
 * receive a timeline copy. The third does not. The streams poller is disabled so it does not race
 * this HTTP-only check.
 */
@Tag("smoke")
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class BoundedFollowerFanoutSmokeTest {

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

    /**
     * Points the application at DynamoDB Local, enables resource creation, sets a small follower
     * cap, and disables the streams poller.
     *
     * @param registry dynamic property registry
     */
    @DynamicPropertySource
    static void configure(DynamicPropertyRegistry registry) {
        registry.add("dynamodb.endpoint",
                () -> "http://" + DYNAMODB.getHost() + ":" + DYNAMODB.getMappedPort(DYNAMODB_PORT));
        registry.add("dynamodb.create-resources", () -> "true");
        registry.add("dynamodb.streams.enabled", () -> "false");
        registry.add("dynamodb.follower-fanout-cap", () -> "2");
    }

    @Test
    void publish_whenThreeFollowersAndCapTwo_returnsCreatedAndSkipsLaterFollower() {
        String suffix = unique();
        String author = "user_z_" + suffix;
        String followerA = "user_a_" + suffix;
        String followerB = "user_b_" + suffix;
        String followerC = "user_c_" + suffix;
        createUser(author);
        createUser(followerA);
        createUser(followerB);
        createUser(followerC);
        follow(followerA, author);
        follow(followerB, author);
        follow(followerC, author);

        ResponseEntity<PublishBody> created = restTemplate.exchange(
                url("/api/v1/posts"), HttpMethod.POST,
                jsonEntity(author, "{\"text\":\"Hello followers\",\"visibility\":\"PUBLIC\"}"),
                PublishBody.class);
        assertThat(created.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        String postId = created.getBody().postId();

        assertThat(timelinePostIds(followerA)).containsExactly(postId);
        assertThat(timelinePostIds(followerB)).containsExactly(postId);
        assertThat(timelinePostIds(followerC)).isEmpty();
    }

    /**
     * Reads timeline post ids over HTTP.
     *
     * @param userId timeline owner
     * @return post ids on the page
     */
    private List<String> timelinePostIds(String userId) {
        ResponseEntity<PageBody> response = restTemplate.exchange(
                url("/api/v1/timeline/" + userId), HttpMethod.GET, HttpEntity.EMPTY, PageBody.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        return response.getBody().items().stream().map(TimelineItemBody::postId).toList();
    }

    /**
     * Creates a user with a caller-chosen id so sort-key order is deterministic.
     *
     * @param userId natural user id
     */
    private void createUser(String userId) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        ResponseEntity<String> created = restTemplate.postForEntity(
                url("/api/v1/users"),
                new HttpEntity<>("{\"userId\":\"" + userId + "\",\"displayName\":\"" + userId + "\"}", headers),
                String.class);
        assertThat(created.getStatusCode()).isEqualTo(HttpStatus.CREATED);
    }

    /**
     * Creates a follow edge from {@code actor} to {@code targetUserId}.
     *
     * @param actor        follower
     * @param targetUserId followee
     */
    private void follow(String actor, String targetUserId) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.add(ACTOR_HEADER, actor);
        ResponseEntity<String> followed = restTemplate.exchange(
                url("/api/v1/users/" + targetUserId + "/follows"),
                HttpMethod.POST, new HttpEntity<>(headers), String.class);
        assertThat(followed.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    /**
     * Builds a JSON request with the actor header.
     *
     * @param actor caller user id
     * @param body  JSON body
     * @return HTTP entity
     */
    private HttpEntity<String> jsonEntity(String actor, String body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.add(ACTOR_HEADER, actor);
        return new HttpEntity<>(body, headers);
    }

    /**
     * Builds the local application URL for a path.
     *
     * @param path request path
     * @return absolute URL
     */
    private String url(String path) {
        return "http://localhost:" + port + path;
    }

    /**
     * Returns a short unique suffix for user ids in this test method.
     *
     * @return 12-character hex suffix
     */
    private static String unique() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 12);
    }

    /** Minimal view of a timeline page. */
    record PageBody(String userId, List<TimelineItemBody> items, String nextToken) {
    }

    /** Minimal view of a timeline item. */
    record TimelineItemBody(String postId) {
    }

    /** Minimal view of the publish success body. */
    record PublishBody(String postId) {
    }
}
