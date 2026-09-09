package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.smoke;

import static org.assertj.core.api.Assertions.assertThat;

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
 * Smoke test covering the read-inbox critical path end-to-end against a running stack.
 *
 * <p>Boots the full web application against DynamoDB Local, creates a direct conversation and a
 * group, sends a message in each so both surface in the owner's inbox, then reads the inbox and
 * confirms most-recent-activity ordering across types and a clean page. The streams poller is
 * disabled so it does not race this HTTP-only check.
 */
@Tag("smoke")
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class ListInboxSmokeTest {

    private static final int DYNAMODB_PORT = 8000;
    private static final String ACTOR_HEADER = "X-User-Id";
    private static final long DISTINCT_SECOND_MILLIS = 1_100L;

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
    void readInboxCriticalPath() {
        String owner = createUser();
        String partner = createUser();
        String other = createUser();

        String direct = createDirectMessage(owner, partner);
        sendMessage(owner, direct, "are you free");
        settle();
        String group = createGroup(owner, "Study group", owner, partner, other);
        sendMessage(owner, group, "see you at three");

        ResponseEntity<PageBody> merged = listInbox(owner, "?limit=1");
        assertThat(merged.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(merged.getBody().userId()).isEqualTo(owner);
        assertThat(merged.getBody().items()).hasSize(1);
        assertThat(merged.getBody().items().get(0).conversationId()).isEqualTo(group);
        assertThat(merged.getBody().nextToken()).isNotBlank();

        ResponseEntity<PageBody> nextPage = listInbox(owner,
                "?limit=1&nextToken=" + merged.getBody().nextToken());
        assertThat(nextPage.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(nextPage.getBody().items().get(0).conversationId()).isEqualTo(direct);

        ResponseEntity<PageBody> groupsOnly = listInbox(owner, "?type=GROUP");
        assertThat(groupsOnly.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(groupsOnly.getBody().items()).hasSize(1);
        assertThat(groupsOnly.getBody().items().get(0).conversationId()).isEqualTo(group);

        ResponseEntity<String> rejected = restTemplate.exchange(
                url("/api/v1/inbox/" + owner + "?limit=101"),
                HttpMethod.GET, HttpEntity.EMPTY, String.class);
        assertThat(rejected.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(rejected.getBody()).contains("VALIDATION_ERROR");
    }

    @Test
    void startupSeededInboxProjectionsAppearBeforeAnyMessageIsSent() {
        assertSeededInbox("user_alice", true);
        assertSeededInbox("user_bob", true);
        assertSeededInbox("user_carol", false);
    }

    private ResponseEntity<PageBody> listInbox(String userId, String query) {
        return restTemplate.exchange(url("/api/v1/inbox/" + userId + query),
                HttpMethod.GET, HttpEntity.EMPTY, PageBody.class);
    }

    /** Asserts the startup-seeded direct and group projections visible to one seeded participant. */
    private void assertSeededInbox(String userId, boolean participatesInDirectMessage) {
        ResponseEntity<PageBody> direct = listInbox(userId, "?type=DIRECT_MESSAGE");
        assertThat(direct.getStatusCode()).isEqualTo(HttpStatus.OK);
        if (participatesInDirectMessage) {
            assertThat(direct.getBody().items())
                    .extracting(InboxItemBody::conversationId)
                    .containsExactly("conv_alice_bob");
        } else {
            assertThat(direct.getBody().items()).isEmpty();
        }

        ResponseEntity<PageBody> group = listInbox(userId, "?type=GROUP");
        assertThat(group.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(group.getBody().items())
                .extracting(InboxItemBody::conversationId)
                .containsExactly("conv_study_group");
        assertThat(group.getBody().items().get(0).title()).isEqualTo("Study group");
        assertThat(group.getBody().items().get(0).lastMessagePreview()).isEqualTo("No messages yet");

        ResponseEntity<PageBody> merged = listInbox(userId, "");
        assertThat(merged.getStatusCode()).isEqualTo(HttpStatus.OK);
        if (participatesInDirectMessage) {
            assertThat(merged.getBody().items())
                    .extracting(InboxItemBody::conversationId)
                    .containsExactly("conv_study_group", "conv_alice_bob");
        } else {
            assertThat(merged.getBody().items())
                    .extracting(InboxItemBody::conversationId)
                    .containsExactly("conv_study_group");
        }
    }

    private String createDirectMessage(String creator, String other) {
        return createConversation(creator,
                "{\"type\":\"DIRECT_MESSAGE\",\"participantUserIds\":" + jsonArray(creator, other) + "}");
    }

    private String createGroup(String creator, String title, String... members) {
        return createConversation(creator,
                "{\"type\":\"GROUP\",\"title\":\"" + title + "\",\"participantUserIds\":"
                        + jsonArray(members) + "}");
    }

    private String createConversation(String actor, String body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.add(ACTOR_HEADER, actor);
        ResponseEntity<ConversationBody> response = restTemplate.exchange(
                url("/api/v1/conversations"), HttpMethod.POST, new HttpEntity<>(body, headers),
                ConversationBody.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        return response.getBody().conversationId();
    }

    private void sendMessage(String actor, String conversationId, String text) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.add(ACTOR_HEADER, actor);
        ResponseEntity<String> response = restTemplate.exchange(
                url("/api/v1/conversations/" + conversationId + "/messages"),
                HttpMethod.POST, new HttpEntity<>("{\"text\":\"" + text + "\"}", headers), String.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
    }

    private String createUser() {
        String userId = "user_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        String json = "{\"userId\":\"" + userId + "\",\"displayName\":\"" + userId + "\"}";
        ResponseEntity<String> created = restTemplate.postForEntity(
                url("/api/v1/users"), new HttpEntity<>(json, headers), String.class);
        assertThat(created.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        return userId;
    }

    private static String jsonArray(String... ids) {
        return List.of(ids).stream()
                .map(id -> "\"" + id + "\"")
                .collect(Collectors.joining(",", "[", "]"));
    }

    private static void settle() {
        try {
            Thread.sleep(DISTINCT_SECOND_MILLIS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Interrupted while spacing inbox activity", e);
        }
    }

    private String url(String path) {
        return "http://localhost:" + port + path;
    }

    record PageBody(String userId, List<InboxItemBody> items, String nextToken) {
    }

    record InboxItemBody(String conversationId, String type, String title, String lastMessagePreview,
                         String lastActivityAt) {
    }

    record ConversationBody(String conversationId, String type, String title, long participantCount,
                            String createdAt) {
    }
}
