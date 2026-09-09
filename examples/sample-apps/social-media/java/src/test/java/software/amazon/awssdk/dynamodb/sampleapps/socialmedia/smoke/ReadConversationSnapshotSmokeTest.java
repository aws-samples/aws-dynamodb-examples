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
 *  smoke test covering the read-conversation-snapshot critical path end-to-end against a
 * running stack.
 *
 * <p>Boots the full web application against DynamoDB Local, creates profiles, a direct message and a
 * group larger than one 100-item transaction, reads each snapshot (exercising the {@code TransactGetItems}
 * fast path and the participant {@code Query} fallback), confirms a non-participant still receives the
 * snapshot, and confirms an unknown conversation returns {@code 404}. The streams poller is disabled
 * so it does not race this HTTP-only check.
 */
@Tag("smoke")
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class ReadConversationSnapshotSmokeTest {

    private static final int DYNAMODB_PORT = 8000;

private static final int LARGE_GROUP_SIZE = 100;

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
    void readSnapshot_withDirectMessage_returnsConversationAndNotFoundOutcomes() {
        String alice = createUser();
        String bob = createUser();
        String conversationId = createConversation(alice,
                "{\"type\":\"DIRECT_MESSAGE\",\"participantUserIds\":" + jsonArray(alice, bob) + "}");

        ResponseEntity<String> snapshot = readSnapshot(alice, conversationId);
        assertThat(snapshot.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(snapshot.getBody()).contains("\"type\":\"DIRECT_MESSAGE\"");
        assertThat(snapshot.getBody()).contains("\"participantCount\":2");
        assertThat(snapshot.getBody()).contains(alice);
        assertThat(snapshot.getBody()).contains(bob);

        // Not membership-gated: an outsider who knows the id still receives the snapshot.
        ResponseEntity<String> outsiderRead = readSnapshot(createUser(), conversationId);
        assertThat(outsiderRead.getStatusCode()).isEqualTo(HttpStatus.OK);

        ResponseEntity<String> missing = readSnapshot(alice, "conv_missing");
        assertThat(missing.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(missing.getBody()).contains("CONVERSATION_NOT_FOUND");
    }

    @Test
    void readSnapshot_withOneHundredParticipants_usesFallbackAndReturnsEveryParticipant() {
        List<String> members = new ArrayList<>();
        for (int i = 0; i < LARGE_GROUP_SIZE; i++) {
            members.add(createUser());
        }
        String conversationId = createConversation(members.get(0),
                "{\"type\":\"GROUP\",\"title\":\"Big group\",\"participantUserIds\":"
                        + jsonArray(members.toArray(String[]::new)) + "}");

        ResponseEntity<String> snapshot = readSnapshot(members.get(0), conversationId);
        assertThat(snapshot.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(snapshot.getBody()).contains("\"participantCount\":" + LARGE_GROUP_SIZE);
        for (String member : members) {
            assertThat(snapshot.getBody()).contains(member);
        }
    }

    private String createConversation(String actor, String body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.add("X-User-Id", actor);
        ResponseEntity<String> created = restTemplate.exchange(
                "http://localhost:" + port + "/api/v1/conversations",
                HttpMethod.POST, new HttpEntity<>(body, headers), String.class);
        assertThat(created.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        return extractConversationId(created.getBody());
    }

    private ResponseEntity<String> readSnapshot(String actor, String conversationId) {
        HttpHeaders headers = new HttpHeaders();
        headers.add("X-User-Id", actor);
        return restTemplate.exchange(
                "http://localhost:" + port + "/api/v1/conversations/" + conversationId,
                HttpMethod.GET, new HttpEntity<>(headers), String.class);
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

    private static String jsonArray(String... ids) {
        return List.of(ids).stream()
                .map(id -> "\"" + id + "\"")
                .collect(Collectors.joining(",", "[", "]"));
    }
}
