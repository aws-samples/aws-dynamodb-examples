package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.integration.stream;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import java.util.UUID;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.ApplicationContext;
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
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.NotificationRepository;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.stream.DynamoDbStreamConsumer;

/**
 * determinism test confirming {@code dynamodb.streams.enabled=false} runs the application
 * HTTP-only.
 *
 * <p>With the poller disabled the {@link DynamoDbStreamConsumer} bean must not be instantiated at all,
 * so both stream sources are off. A published post therefore projects no notifications. One
 * client-type is enough because the disabled-consumer wiring is independent of the SDK mapping style.
 */
@Tag("integration")
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = "dynamodb.client-type=high-level")
class StreamConsumerDisabledIntegrationTest {

    private static final int DYNAMODB_PORT = 8000;

    private static final String ACTOR_HEADER = "X-User-Id";

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
    private NotificationRepository notificationRepository;

    @Autowired
    private ApplicationContext applicationContext;

    @DynamicPropertySource
    static void configure(DynamicPropertyRegistry registry) {
        registry.add("dynamodb.endpoint",
                () -> "http://" + DYNAMODB.getHost() + ":" + DYNAMODB.getMappedPort(DYNAMODB_PORT));
        registry.add("dynamodb.create-resources", () -> "true");
        registry.add("dynamodb.streams.enabled", () -> "false");
    }

    @Test
    void consumerBeanIsNotInstantiated() {
        assertThat(applicationContext.getBeanNamesForType(DynamoDbStreamConsumer.class)).isEmpty();
    }

    @Test
    void noNotificationsAreProjectedWhenDisabled() {
        String author = createUser();
        String follower = createUser();
        follow(follower, author);

        ResponseEntity<String> published = restTemplate.exchange(url("/api/v1/posts"), HttpMethod.POST,
                jsonEntity(author, "{\"text\":\"No consumer\",\"visibility\":\"PUBLIC\"}"), String.class);
        assertThat(published.getStatusCode()).isEqualTo(HttpStatus.CREATED);

        sleep(NEGATIVE_WINDOW);
        assertThat(notificationRepository.queryNotifications(follower).join()).isEmpty();
    }

    private void sleep(Duration duration) {
        try {
            Thread.sleep(duration.toMillis());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("interrupted while waiting", e);
        }
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
}
