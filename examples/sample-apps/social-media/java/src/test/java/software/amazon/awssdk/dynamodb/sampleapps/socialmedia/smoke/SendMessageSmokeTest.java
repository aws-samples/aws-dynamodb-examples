package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.smoke;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

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
 * smoke test covering the conversation-create and message-send critical path end-to-end
 * against a running stack.
 *
 * <p>Boots the full web application against DynamoDB Local, creates profiles, a direct message and a
 * group larger than one 25-item batch, sends a message into each, and confirms a non-participant is
 * rejected. The streams poller is disabled so it does not race this HTTP-only check.
 */
@Tag("smoke")
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class SendMessageSmokeTest {

    private static final int DYNAMODB_PORT = 8000;

    private static final int LARGE_GROUP_SIZE = 30;

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
    void createDirectMessageThenSendCriticalPath() {
        String alice = createUser();
        String carol = createUser();

        ResponseEntity<String> created = createConversation(alice,
                "{\"type\":\"DIRECT_MESSAGE\",\"participantUserIds\":" + jsonArray(alice, carol) + "}");
        assertThat(created.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(created.getBody()).contains("\"type\":\"DIRECT_MESSAGE\"");
        assertThat(created.getBody()).contains("\"participantCount\":2");
        String conversationId = extractConversationId(created.getBody());

        ResponseEntity<String> sent = sendMessage(alice, conversationId, "{\"text\":\"Are you free?\"}");
        assertThat(sent.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(sent.getBody()).contains("\"conversationId\":\"" + conversationId + "\"");
        assertThat(sent.getBody()).contains("\"senderId\":\"" + alice + "\"");

        ResponseEntity<String> rejected = sendMessage(createUser(), conversationId, "{\"text\":\"Hi\"}");
        assertThat(rejected.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(rejected.getBody()).contains("NOT_A_PARTICIPANT");
    }

    @Test
    void createLargeGroupThenSendCriticalPath() {
        List<String> members = new ArrayList<>();
        for (int i = 0; i < LARGE_GROUP_SIZE; i++) {
            members.add(createUser());
        }
        String creator = members.get(0);

        ResponseEntity<String> created = createConversation(creator,
                "{\"type\":\"GROUP\",\"title\":\"Big group\",\"participantUserIds\":"
                        + jsonArray(members.toArray(String[]::new)) + "}");
        assertThat(created.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(created.getBody()).contains("\"participantCount\":" + LARGE_GROUP_SIZE);
        String conversationId = extractConversationId(created.getBody());

        ResponseEntity<String> sent = sendMessage(creator, conversationId, "{\"text\":\"Hello everyone\"}");
        assertThat(sent.getStatusCode()).isEqualTo(HttpStatus.CREATED);
    }

    @Test
    void replayableConversationAndMessageReturnTheirOriginalIdentities() {
        String alice = createUser();
        String carol = createUser();
        String conversationBody = "{\"type\":\"DIRECT_MESSAGE\",\"clientRequestId\":\"conversation_smoke_123\","
                + "\"participantUserIds\":" + jsonArray(alice, carol) + "}";

        ResponseEntity<String> conversation = createConversation(alice, conversationBody);
        ResponseEntity<String> conversationReplay = createConversation(alice, conversationBody);
        String conversationId = extractConversationId(conversation.getBody());
        String messageBody = "{\"text\":\"Are you free?\",\"clientRequestId\":\"message_smoke_123\"}";

        ResponseEntity<String> message = sendMessage(alice, conversationId, messageBody);
        ResponseEntity<String> messageReplay = sendMessage(alice, conversationId, messageBody);

        assertThat(conversation.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(conversationReplay.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(extractConversationId(conversationReplay.getBody())).isEqualTo(conversationId);
        assertThat(message.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(messageReplay.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(extractMessageId(messageReplay.getBody())).isEqualTo(extractMessageId(message.getBody()));
    }

    private ResponseEntity<String> createConversation(String actor, String body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.add("X-User-Id", actor);
        return restTemplate.exchange(
                "http://localhost:" + port + "/api/v1/conversations",
                HttpMethod.POST, new HttpEntity<>(body, headers), String.class);
    }

    private ResponseEntity<String> sendMessage(String actor, String conversationId, String body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.add("X-User-Id", actor);
        return restTemplate.exchange(
                "http://localhost:" + port + "/api/v1/conversations/" + conversationId + "/messages",
                HttpMethod.POST, new HttpEntity<>(body, headers), String.class);
    }

    private String createUser() {
        String userId = "user_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        String json = "{\"userId\":\"" + userId + "\",\"displayName\":\"" + userId + "\"}";
        ResponseEntity<String> created = restTemplate.postForEntity(
                "http://localhost:" + port + "/api/v1/users", new HttpEntity<>(json, headers), String.class);
        assertThat(created.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        return userId;
    }

    private static String extractConversationId(String body) {
        String marker = "\"conversationId\":\"";
        int start = body.indexOf(marker) + marker.length();
        int end = body.indexOf('"', start);
        return body.substring(start, end);
    }

    /** Extracts the message id from the small JSON response used by this smoke test. */
    private static String extractMessageId(String body) {
        String marker = "\"messageId\":\"";
        int start = body.indexOf(marker) + marker.length();
        int end = body.indexOf('"', start);
        return body.substring(start, end);
    }

    private static String jsonArray(String... ids) {
        return List.of(ids).stream()
                .map(id -> "\"" + id + "\"")
                .collect(Collectors.joining(",", "[", "]"));
    }
}
