package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.integration.follow;

import static org.assertj.core.api.Assertions.assertThat;

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

/**
 * Follow-user integration tests booting the full web application against DynamoDB Local.
 *
 * <p>The same scenarios run for every {@code dynamodb.client-type} via the concrete subclasses so
 * both access styles write an identical edge pair and produce identical HTTP outcomes. A single
 * DynamoDB Local container is shared across the client-type subclasses (singleton pattern) and the
 * streams poller is disabled so it does not race these HTTP-only tests. Every test uses freshly generated user ids so the two client-type runs never collide in
 * the shared container.
 */
abstract class AbstractFollowUserIntegrationTest {

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
     * Points the application at the shared DynamoDB Local container, enables resource creation, and
     * disables the streams poller for these HTTP-only tests.
     *
     * @param registry dynamic property registry
     */
    @DynamicPropertySource
    static void configure(DynamicPropertyRegistry registry) {
        registry.add("dynamodb.endpoint",
                () -> "http://" + DYNAMODB.getHost() + ":" + DYNAMODB.getMappedPort(DYNAMODB_PORT));
        registry.add("dynamodb.create-resources", () -> "true");
        registry.add("dynamodb.streams.enabled", () -> "false");
    }

    @Test
    void validFollowReturns200WithBothEdges() {
        String follower = createUser();
        String followee = createUser();

        ResponseEntity<FollowBody> response = follow(follower, followee, FollowBody.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().followerId()).isEqualTo(follower);
        assertThat(response.getBody().followeeId()).isEqualTo(followee);
        assertThat(response.getBody().createdAt()).endsWith("Z");
    }

    @Test
    void missingActorReturns400ValidationError() {
        String followee = createUser();

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        ResponseEntity<ErrorBody> response = restTemplate.exchange(
                followUrl(followee), HttpMethod.POST, new HttpEntity<>(headers), ErrorBody.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().error()).isEqualTo("VALIDATION_ERROR");
    }

    @Test
    void selfFollowReturns400CannotFollowSelf() {
        String user = createUser();

        ResponseEntity<ErrorBody> response = follow(user, user, ErrorBody.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().error()).isEqualTo("CANNOT_FOLLOW_SELF");
    }

    @Test
    void unknownFollowerReturns404UserNotFound() {
        String followee = createUser();

        ResponseEntity<ErrorBody> response = follow(uniqueUserId(), followee, ErrorBody.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().error()).isEqualTo("USER_NOT_FOUND");
    }

    @Test
    void unknownFolloweeReturns404UserNotFound() {
        String follower = createUser();

        ResponseEntity<ErrorBody> response = follow(follower, uniqueUserId(), ErrorBody.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().error()).isEqualTo("USER_NOT_FOUND");
    }

    @Test
    void duplicateFollowReturns409AlreadyFollowing() {
        String follower = createUser();
        String followee = createUser();
        assertThat(follow(follower, followee, FollowBody.class).getStatusCode()).isEqualTo(HttpStatus.OK);

        ResponseEntity<ErrorBody> duplicate = follow(follower, followee, ErrorBody.class);

        assertThat(duplicate.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(duplicate.getBody()).isNotNull();
        assertThat(duplicate.getBody().error()).isEqualTo("ALREADY_FOLLOWING");
    }

    @Test
    void malformedTargetUserIdReturns400ValidationError() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.add(ACTOR_HEADER, createUser());
        ResponseEntity<ErrorBody> response = restTemplate.exchange(
                "http://localhost:" + port + "/api/v1/users/bad$id/follows",
                HttpMethod.POST, new HttpEntity<>(headers), ErrorBody.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().error()).isEqualTo("VALIDATION_ERROR");
    }

    private <T> ResponseEntity<T> follow(String actor, String targetUserId, Class<T> responseType) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.add(ACTOR_HEADER, actor);
        return restTemplate.exchange(
                followUrl(targetUserId), HttpMethod.POST, new HttpEntity<>(headers), responseType);
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

    private String followUrl(String targetUserId) {
        return "http://localhost:" + port + "/api/v1/users/" + targetUserId + "/follows";
    }

    private static String uniqueUserId() {
        return "user_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
    }

    /** Minimal view of the follow success body. */
    record FollowBody(String followerId, String followeeId, String createdAt) {
    }

    /** Minimal view of the error envelope. */
    record ErrorBody(String error, String message) {
    }
}
