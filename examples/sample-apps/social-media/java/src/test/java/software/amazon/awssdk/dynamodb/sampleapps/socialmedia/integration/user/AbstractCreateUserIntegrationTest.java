package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.integration.user;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.utility.DockerImageName;

/**
 * Create-user integration tests booting the full web application against DynamoDB Local.
 *
 * <p>The same scenarios run for every {@code dynamodb.client-type} via the concrete subclasses so
 * both access styles persist an identical profile and produce identical HTTP outcomes. A single
 * DynamoDB Local container is shared across the client-type subclasses (singleton pattern) and the
 * streams poller is disabled so it does not race these HTTP-only tests. Every test uses a freshly generated {@code userId} so the two client-type runs never
 * collide in the shared container.
 */
abstract class AbstractCreateUserIntegrationTest {

private static final int DYNAMODB_PORT = 8000;

private static final String INITIAL_DISPLAY_NAME = "Diana";

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
    void firstCreateReturns201WithProfile() {
        String userId = uniqueUserId();

        ResponseEntity<CreateUserBody> response = create(userId, INITIAL_DISPLAY_NAME);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().userId()).isEqualTo(userId);
        assertThat(response.getBody().displayName()).isEqualTo(INITIAL_DISPLAY_NAME);
        assertThat(response.getBody().createdAt()).endsWith("Z");
    }

    @Test
    void matchingDisplayNameReplayReturns200WithStoredProfile() {
        String userId = uniqueUserId();
        CreateUserBody created = create(userId, INITIAL_DISPLAY_NAME).getBody();
        assertThat(created).isNotNull();

        ResponseEntity<CreateUserBody> retry = create(userId, INITIAL_DISPLAY_NAME);

        assertThat(retry.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(retry.getBody()).isNotNull();
        assertThat(retry.getBody().userId()).isEqualTo(userId);
        assertThat(retry.getBody().displayName()).isEqualTo(INITIAL_DISPLAY_NAME);
        // The stored createdAt is replayed, not regenerated.
        assertThat(retry.getBody().createdAt()).isEqualTo(created.createdAt());
    }

    @Test
    void changedDisplayNameReplayReturns200AndPreservesStoredProfile() {
        String userId = uniqueUserId();
        CreateUserBody created = create(userId, INITIAL_DISPLAY_NAME).getBody();
        assertThat(created).isNotNull();

        ResponseEntity<CreateUserBody> replay = create(userId, "Impostor");

        assertThat(replay.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(replay.getBody()).isNotNull();
        assertThat(replay.getBody().userId()).isEqualTo(userId);
        assertThat(replay.getBody().displayName()).isEqualTo(INITIAL_DISPLAY_NAME);
        assertThat(replay.getBody().createdAt()).isEqualTo(created.createdAt());
    }

    @Test
    void invalidUserIdReturns400ValidationError() {
        ResponseEntity<ErrorBody> response =
                restTemplate.postForEntity(url(), body("ab", INITIAL_DISPLAY_NAME), ErrorBody.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().error()).isEqualTo("VALIDATION_ERROR");
    }

    @Test
    void blankDisplayNameReturns400ValidationError() {
        ResponseEntity<ErrorBody> response =
                restTemplate.postForEntity(url(), body(uniqueUserId(), "  "), ErrorBody.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().error()).isEqualTo("VALIDATION_ERROR");
    }

    private ResponseEntity<CreateUserBody> create(String userId, String displayName) {
        return restTemplate.postForEntity(url(), body(userId, displayName), CreateUserBody.class);
    }

    private static HttpEntity<String> body(String userId, String displayName) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        String json = "{\"userId\":\"" + userId + "\",\"displayName\":\"" + displayName + "\"}";
        return new HttpEntity<>(json, headers);
    }

    private String url() {
        return "http://localhost:" + port + "/api/v1/users";
    }

    private static String uniqueUserId() {
        return "user_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
    }

    /** Minimal view of the {@code POST /api/v1/users} success body. */
    record CreateUserBody(String userId, String displayName, String createdAt) {
    }

    /** Minimal view of the error envelope. */
    record ErrorBody(String error, String message) {
    }
}
