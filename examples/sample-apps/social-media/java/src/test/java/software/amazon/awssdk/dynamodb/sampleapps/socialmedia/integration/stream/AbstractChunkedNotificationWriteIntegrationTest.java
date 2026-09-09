package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.integration.stream;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import java.util.ArrayList;
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
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.Notification;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.SourceType;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.NotificationRepository;

/**
 * Chunked notification-write integration tests against DynamoDB Local.
 *
 * <p>The same scenarios run for every {@code dynamodb.client-type} via the concrete subclasses so both
 * access styles write every recipient across sequential chunks. A single DynamoDB Local container is
 * shared across the client-type subclasses. The consumer polls with {@code TRIM_HORIZON} so every
 * event written after startup is projected deterministically. Concurrency is set to 2 so five
 * recipients cross a chunk boundary.
 */
abstract class AbstractChunkedNotificationWriteIntegrationTest {

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

    /**
     * Points the application at the shared container, enables streams, and sets write concurrency to 2.
     *
     * @param registry dynamic property registry
     */
    @DynamicPropertySource
    static void configure(DynamicPropertyRegistry registry) {
        registry.add("dynamodb.endpoint",
                () -> "http://" + DYNAMODB.getHost() + ":" + DYNAMODB.getMappedPort(DYNAMODB_PORT));
        registry.add("dynamodb.create-resources", () -> "true");
        registry.add("dynamodb.streams.enabled", () -> "true");
        registry.add("dynamodb.streams.iterator-type", () -> "TRIM_HORIZON");
        registry.add("dynamodb.notification-write-concurrency", () -> "2");
    }

    @Test
    void publicPostNotifiesEveryFollowerAcrossChunks() {
        String suffix = unique();
        String author = "user_z_" + suffix;
        List<String> followers = List.of(
                "user_a_" + suffix, "user_b_" + suffix, "user_c_" + suffix,
                "user_d_" + suffix, "user_e_" + suffix);
        createUser(author);
        for (String follower : followers) {
            createUser(follower);
            follow(follower, author);
        }

        String postId = publish(author, "{\"text\":\"Hello followers\",\"visibility\":\"PUBLIC\"}");

        for (String follower : followers) {
            awaitNotification(follower, SourceType.POST, postId);
        }
        assertThat(sourceIds(author)).doesNotContain(postId);
        for (String follower : followers) {
            assertThat(notificationsFor(follower).stream()
                    .filter(notification -> postId.equals(notification.getSourceId())))
                    .hasSize(1);
        }
    }

    @Test
    void messageNotifiesEveryParticipantAcrossChunks() {
        String suffix = unique();
        String sender = "user_s_" + suffix;
        List<String> members = List.of(
                "user_a_" + suffix, "user_b_" + suffix, "user_c_" + suffix, "user_d_" + suffix);
        createUser(sender);
        for (String member : members) {
            createUser(member);
        }
        List<String> participants = new ArrayList<>();
        participants.add(sender);
        participants.addAll(members);
        String conversationId = createGroup(sender, participants);

        String messageId = sendMessage(sender, conversationId, "Standup at 10");

        for (String member : members) {
            awaitNotification(member, SourceType.MESSAGE, messageId);
        }
        assertThat(sourceIds(sender)).doesNotContain(messageId);
        for (String member : members) {
            assertThat(notificationsFor(member).stream()
                    .filter(notification -> messageId.equals(notification.getSourceId())))
                    .hasSize(1);
        }
    }

    /**
     * Waits until a matching notification exists for {@code recipient}.
     *
     * @param recipient  notification owner
     * @param sourceType expected source type
     * @param sourceId   expected source id
     */
    private void awaitNotification(String recipient, SourceType sourceType, String sourceId) {
        await(() -> notificationsFor(recipient).stream().anyMatch(
                n -> sourceType.name().equals(n.getSourceType()) && sourceId.equals(n.getSourceId())),
                "notification " + sourceType + "#" + sourceId + " for " + recipient);
    }

    /**
     * Loads stored notifications for {@code recipient}.
     *
     * @param recipient notification owner
     * @return stored rows
     */
    private List<Notification> notificationsFor(String recipient) {
        return notificationRepository.queryNotifications(recipient).join();
    }

    /**
     * Extracts source ids from stored notifications.
     *
     * @param recipient notification owner
     * @return source ids
     */
    private List<String> sourceIds(String recipient) {
        return notificationsFor(recipient).stream().map(Notification::getSourceId).toList();
    }

    /**
     * Polls {@code condition} until it is true or {@link #AWAIT_TIMEOUT} elapses.
     *
     * @param condition   success predicate
     * @param description timeout message
     */
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

    /**
     * Sleeps for {@code duration}, restoring interrupt status on cancellation.
     *
     * @param duration sleep time
     */
    private void sleep(Duration duration) {
        try {
            Thread.sleep(duration.toMillis());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("interrupted while waiting", e);
        }
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
     * Creates a group conversation and returns its id.
     *
     * @param actor   creator
     * @param members participant user ids, including the creator
     * @return conversation id
     */
    private String createGroup(String actor, List<String> members) {
        String ids = String.join("\",\"", members);
        ResponseEntity<ConversationBody> response = restTemplate.exchange(
                url("/api/v1/conversations"), HttpMethod.POST,
                jsonEntity(actor, "{\"type\":\"GROUP\",\"participantUserIds\":[\"" + ids + "\"]}"),
                ConversationBody.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        return response.getBody().conversationId();
    }

    /**
     * Sends a message and returns the created message id.
     *
     * @param actor          sender
     * @param conversationId conversation
     * @param text           message text
     * @return message id
     */
    private String sendMessage(String actor, String conversationId, String text) {
        ResponseEntity<MessageBody> response = restTemplate.exchange(
                url("/api/v1/conversations/" + conversationId + "/messages"), HttpMethod.POST,
                jsonEntity(actor, "{\"text\":\"" + text + "\"}"), MessageBody.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        return response.getBody().messageId();
    }

    /**
     * Creates a user with a caller-chosen id.
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

    /** Minimal view of the create-conversation body. */
    record ConversationBody(String conversationId) {
    }

    /** Minimal view of the send-message body. */
    record MessageBody(String messageId) {
    }
}
