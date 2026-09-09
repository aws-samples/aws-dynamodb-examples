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
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.Notification;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.SourceType;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.NotificationRepository;

/**
 * smoke test covering the notification critical path for both streams end-to-end against a
 * running stack.
 *
 * <p>Boots the full web application against DynamoDB Local with the in-process consumer enabled, then
 * confirms a {@code PUBLIC} post insert projects a follower notification and a group message insert
 * projects one notification per participant except the sender. The consumer polls with
 * {@code TRIM_HORIZON} for deterministic replay. Notifications have no HTTP surface, so the
 * observable outcome is read through the repository.
 */
@Tag("smoke")
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class StreamNotificationsSmokeTest {

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

    @Autowired
    private NotificationRepository notificationRepository;

    @DynamicPropertySource
    static void configure(DynamicPropertyRegistry registry) {
        registry.add("dynamodb.endpoint",
                () -> "http://" + DYNAMODB.getHost() + ":" + DYNAMODB.getMappedPort(DYNAMODB_PORT));
        registry.add("dynamodb.create-resources", () -> "true");
        registry.add("dynamodb.streams.enabled", () -> "true");
        registry.add("dynamodb.streams.iterator-type", () -> "TRIM_HORIZON");
    }

    @Test
    void postInsertNotifiesFollowerCriticalPath() {
        String author = createUser();
        String follower = createUser();
        follow(follower, author);

        String postId = publishPost(author, "{\"text\":\"Launch day\",\"visibility\":\"PUBLIC\"}");

        awaitNotification(follower, SourceType.POST, postId);
    }

    @Test
    void messageInsertNotifiesParticipantsCriticalPath() {
        String sender = createUser();
        String memberOne = createUser();
        String memberTwo = createUser();
        String conversationId = createGroup(sender, List.of(sender, memberOne, memberTwo));

        String messageId = sendMessage(sender, conversationId, "Standup at 10");

        awaitNotification(memberOne, SourceType.MESSAGE, messageId);
        awaitNotification(memberTwo, SourceType.MESSAGE, messageId);
        assertThat(notificationRepository.queryNotifications(sender).join()
                .stream().map(Notification::getSourceId).toList()).doesNotContain(messageId);
    }

    private void awaitNotification(String recipient, SourceType sourceType, String sourceId) {
        await(() -> notificationRepository.queryNotifications(recipient).join().stream().anyMatch(
                n -> sourceType.name().equals(n.getSourceType()) && sourceId.equals(n.getSourceId())),
                "notification " + sourceType + "#" + sourceId + " for " + recipient);
    }

    private void await(Supplier<Boolean> condition, String description) {
        long deadline = System.nanoTime() + AWAIT_TIMEOUT.toNanos();
        while (System.nanoTime() < deadline) {
            if (condition.get()) {
                return;
            }
            sleep();
        }
        assertThat(condition.get()).as("timed out awaiting " + description).isTrue();
    }

    private void sleep() {
        try {
            Thread.sleep(500);
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

    private String createGroup(String actor, List<String> members) {
        String ids = String.join("\",\"", members);
        ResponseEntity<ConversationBody> response = restTemplate.exchange(
                url("/api/v1/conversations"), HttpMethod.POST,
                jsonEntity(actor, "{\"type\":\"GROUP\",\"participantUserIds\":[\"" + ids + "\"]}"),
                ConversationBody.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        return response.getBody().conversationId();
    }

    private String sendMessage(String actor, String conversationId, String text) {
        ResponseEntity<MessageBody> response = restTemplate.exchange(
                url("/api/v1/conversations/" + conversationId + "/messages"), HttpMethod.POST,
                jsonEntity(actor, "{\"text\":\"" + text + "\"}"), MessageBody.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        return response.getBody().messageId();
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

    /** Minimal view of the create-conversation body. */
    record ConversationBody(String conversationId) {
    }

    /** Minimal view of the send-message body. */
    record MessageBody(String messageId) {
    }
}
