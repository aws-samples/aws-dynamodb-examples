package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.integration.stream;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Supplier;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
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
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.Message;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.Notification;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.PostMeta;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.SourceType;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.NotificationRepository;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.stream.DynamoDbStreamConsumer;
import software.amazon.awssdk.services.dynamodb.DynamoDbAsyncClient;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;
import software.amazon.awssdk.services.dynamodb.model.GetItemRequest;

/**
 *  stream-driven notification integration tests booting the full web application against
 * DynamoDB Local with the in-process consumer enabled.
 *
 * <p>The same scenarios run for every {@code dynamodb.client-type} via the concrete subclasses so both
 * access styles project identical notification rows. A single DynamoDB Local container is shared across
 * the client-type subclasses. The consumer polls with {@code TRIM_HORIZON} so every event written after
 * startup is projected deterministically. No S3 container is needed
 * because these tests publish text-only posts.
 */
abstract class AbstractStreamNotificationsIntegrationTest {

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
    private NotificationRepository notificationRepository;

    @Autowired
    private DynamoDbStreamConsumer streamConsumer;

    @Autowired
    private DynamoDbAsyncClient dynamoDbAsyncClient;

    @Value("${dynamodb.table-name.content}")
    private String contentTable;

    @Value("${dynamodb.table-name.messages}")
    private String messagesTable;

    /**
     * Points the application at the shared container, enables resource creation, and enables the
     * consumer from the stream tip's oldest surviving record.
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
    }

    @Test
    void publicPostNotifiesEveryFollowerExceptAuthor() {
        String author = createUser();
        String followerOne = createUser();
        String followerTwo = createUser();
        follow(followerOne, author);
        follow(followerTwo, author);

        String postId = publishPublicPost(author);

        awaitNotification(followerOne, SourceType.POST, postId);
        awaitNotification(followerTwo, SourceType.POST, postId);
        assertThat(notificationsFor(author)).isEmpty();
    }

    @Test
    void restrictedPostNotifiesAllowListOnly() {
        String author = createUser();
        String allowed = createUser();
        String follower = createUser();
        follow(follower, author);

        String postId = publishPost(author,
                "{\"text\":\"Just for you\",\"visibility\":\"RESTRICTED\",\"allowedViewerUserIds\":[\""
                        + allowed + "\"]}");

        awaitNotification(allowed, SourceType.POST, postId);
        sleep(NEGATIVE_WINDOW);
        assertThat(sourceIds(follower)).doesNotContain(postId);
    }

    @Test
    void privatePostNotifiesNobody() {
        String author = createUser();
        String follower = createUser();
        follow(follower, author);

        String postId = publishPost(author, "{\"text\":\"Only me\",\"visibility\":\"PRIVATE\"}");

        sleep(NEGATIVE_WINDOW);
        assertThat(sourceIds(follower)).doesNotContain(postId);
    }

    @Test
    void messageNotifiesEveryParticipantExceptSender() {
        String sender = createUser();
        String memberOne = createUser();
        String memberTwo = createUser();
        String conversationId = createGroup(sender, List.of(sender, memberOne, memberTwo));

        String messageId = sendMessage(sender, conversationId, "Standup at 10").messageId();

        awaitNotification(memberOne, SourceType.MESSAGE, messageId);
        awaitNotification(memberTwo, SourceType.MESSAGE, messageId);
        assertThat(sourceIds(sender)).doesNotContain(messageId);
    }

    @Test
    void duplicatePostStreamDeliveryCreatesOneNotificationPerRecipient() {
        String author = createUser();
        String follower = createUser();
        follow(follower, author);
        String postId = publishPublicPost(author);

        awaitNotification(follower, SourceType.POST, postId);
        Map<String, AttributeValue> postImage = item(
                contentTable, PostMeta.partitionKey(postId), PostMeta.SORT_KEY);
        streamConsumer.consumePostInsert(postImage).join();
        streamConsumer.consumePostInsert(postImage).join();

        assertThat(notificationsFor(follower))
                .filteredOn(notification -> postId.equals(notification.getSourceId()))
                .hasSize(1);
    }

    @Test
    void duplicateMessageStreamDeliveryCreatesOneNotificationPerRecipient() {
        String sender = createUser();
        String recipientOne = createUser();
        String recipientTwo = createUser();
        String conversationId = createGroup(sender, List.of(sender, recipientOne, recipientTwo));
        MessageBody message = sendMessage(sender, conversationId, "Duplicate delivery");

        awaitNotification(recipientOne, SourceType.MESSAGE, message.messageId());
        awaitNotification(recipientTwo, SourceType.MESSAGE, message.messageId());
        Map<String, AttributeValue> messageImage = item(
                messagesTable, Message.partitionKey(conversationId),
                Message.sortKey(message.createdAt(), message.messageId()));
        streamConsumer.consumeMessageInsert(messageImage).join();
        streamConsumer.consumeMessageInsert(messageImage).join();

        assertThat(notificationsFor(recipientOne))
                .filteredOn(notification -> message.messageId().equals(notification.getSourceId()))
                .hasSize(1);
        assertThat(notificationsFor(recipientTwo))
                .filteredOn(notification -> message.messageId().equals(notification.getSourceId()))
                .hasSize(1);
    }

    private void awaitNotification(String recipient, SourceType sourceType, String sourceId) {
        await(() -> notificationsFor(recipient).stream().anyMatch(
                n -> sourceType.name().equals(n.getSourceType()) && sourceId.equals(n.getSourceId())),
                "notification " + sourceType + "#" + sourceId + " for " + recipient);
    }

    private List<Notification> notificationsFor(String recipient) {
        return notificationRepository.queryNotifications(recipient).join();
    }

    private List<String> sourceIds(String recipient) {
        return notificationsFor(recipient).stream().map(Notification::getSourceId).toList();
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

    private String publishPublicPost(String author) {
        return publishPost(author, "{\"text\":\"Hello followers\",\"visibility\":\"PUBLIC\"}");
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

    private MessageBody sendMessage(String actor, String conversationId, String text) {
        ResponseEntity<MessageBody> response = restTemplate.exchange(
                url("/api/v1/conversations/" + conversationId + "/messages"), HttpMethod.POST,
                jsonEntity(actor, "{\"text\":\"" + text + "\"}"), MessageBody.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        return response.getBody();
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

    /** Reads the persisted source row that supplies the duplicate stream new image. */
    private Map<String, AttributeValue> item(String tableName, String pk, String sk) {
        Map<String, AttributeValue> item = dynamoDbAsyncClient.getItem(GetItemRequest.builder()
                        .tableName(tableName)
                        .key(Map.of("PK", AttributeValue.fromS(pk), "SK", AttributeValue.fromS(sk)))
                        .consistentRead(true)
                        .build())
                .join()
                .item();
        assertThat(item).isNotEmpty();
        return item;
    }

    /** Minimal view of the publish success body. */
    record PublishBody(String postId) {
    }

    /** Minimal view of the create-conversation body. */
    record ConversationBody(String conversationId) {
    }

    /** Minimal view of the send-message body. */
    record MessageBody(String messageId, String conversationId, String senderId, String text, String createdAt) {
    }
}
