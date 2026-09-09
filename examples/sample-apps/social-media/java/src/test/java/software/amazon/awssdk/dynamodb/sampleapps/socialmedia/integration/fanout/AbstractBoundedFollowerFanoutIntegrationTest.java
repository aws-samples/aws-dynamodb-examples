package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.integration.fanout;

import static org.assertj.core.api.Assertions.assertThat;

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
import org.testcontainers.utility.DockerImageName;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.FollowerEdge;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.TimelineEntry;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.FollowerQueryResult;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.TimelinePage;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.TimelineRepository;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.UserGraphRepository;

/**
 * Bounded follower enumeration integration tests against DynamoDB Local.
 *
 * <p>The same scenarios run for every {@code dynamodb.client-type} via the concrete subclasses so both
 * access styles return an identical bounded follower page and write identical timeline copies. A
 * single DynamoDB Local container is shared across the client-type subclasses. The streams poller is
 * disabled so it does not race these HTTP-only checks. Every test uses freshly generated user ids so
 * the two client-type runs never collide in the shared container.
 */
abstract class AbstractBoundedFollowerFanoutIntegrationTest {

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

    @Autowired
    private UserGraphRepository userGraphRepository;

    @Autowired
    private TimelineRepository timelineRepository;

    /**
     * Points the application at the shared container, enables resource creation, sets a small
     * follower cap, and disables the streams poller for these HTTP-only tests.
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
    void queryFollowers_whenTwoFollowersAndCapTwo_returnsComplete() {
        String suffix = unique();
        String author = "user_z_" + suffix;
        String followerA = "user_a_" + suffix;
        String followerB = "user_b_" + suffix;
        createUser(author);
        createUser(followerA);
        createUser(followerB);
        follow(followerA, author);
        follow(followerB, author);

        FollowerQueryResult result = userGraphRepository.queryFollowers(author).join();

        assertThat(result.complete()).isTrue();
        assertThat(result.cap()).isEqualTo(2);
        assertThat(result.followers()).extracting(FollowerEdge::getFollowerId)
                .containsExactly(followerA, followerB);
    }

    @Test
    void queryFollowers_whenThreeFollowersAndCapTwo_returnsFirstTwoIncomplete() {
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

        FollowerQueryResult result = userGraphRepository.queryFollowers(author).join();

        assertThat(result.complete()).isFalse();
        assertThat(result.cap()).isEqualTo(2);
        assertThat(result.followers()).extracting(FollowerEdge::getFollowerId)
                .containsExactly(followerA, followerB);
    }

    @Test
    void publish_whenPublicAndCapExceeded_fansOutToFirstFollowersOnly() {
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

        String postId = publish(author, "{\"text\":\"Hello followers\",\"visibility\":\"PUBLIC\"}");

        assertThat(timelinePostIds(followerA)).containsExactly(postId);
        assertThat(timelinePostIds(followerB)).containsExactly(postId);
        assertThat(timelinePostIds(followerC)).isEmpty();
    }

    @Test
    void publish_whenRestricted_fansOutToEntireAllowList() {
        String suffix = unique();
        String author = "user_z_" + suffix;
        String allowedA = "user_a_" + suffix;
        String allowedB = "user_b_" + suffix;
        String allowedC = "user_c_" + suffix;
        createUser(author);
        createUser(allowedA);
        createUser(allowedB);
        createUser(allowedC);

        String postId = publish(author,
                "{\"text\":\"Just for you\",\"visibility\":\"RESTRICTED\",\"allowedViewerUserIds\":[\""
                        + allowedA + "\",\"" + allowedB + "\",\"" + allowedC + "\"]}");

        assertThat(timelinePostIds(allowedA)).containsExactly(postId);
        assertThat(timelinePostIds(allowedB)).containsExactly(postId);
        assertThat(timelinePostIds(allowedC)).containsExactly(postId);
    }

    /**
     * Reads timeline post ids for a recipient with a consistent query.
     *
     * @param recipient timeline owner
     * @return post ids on the first page
     */
    private List<String> timelinePostIds(String recipient) {
        TimelinePage page = timelineRepository.queryTimeline(recipient, 50, false, null).join();
        return page.items().stream().map(TimelineEntry::getPostId).toList();
    }

    /**
     * Publishes a post as {@code actor} and returns the created post id.
     *
     * @param actor author user id
     * @param body  JSON publish body
     * @return created post id
     */
    private String publish(String actor, String body) {
        ResponseEntity<PublishBody> response = restTemplate.exchange(
                url("/api/v1/posts"), HttpMethod.POST, jsonEntity(actor, body), PublishBody.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        return response.getBody().postId();
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

    /** Minimal view of the publish success body. */
    record PublishBody(String postId) {
    }
}
