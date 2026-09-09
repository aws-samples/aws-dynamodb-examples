package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.integration.conversation;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

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
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.mapper.ConversationMapper;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.ConversationMeta;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.ConversationParticipant;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.InboxEntry;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.ConversationRepository;

/**
 *  read-conversation-snapshot integration tests booting the full web application against
 * DynamoDB Local.
 *
 * <p>The same scenarios run for every {@code dynamodb.client-type} via the concrete subclasses so
 * both access styles return identical snapshots and HTTP outcomes. A single DynamoDB Local container
 * is shared across the client-type subclasses (singleton pattern) and the streams poller is disabled
 * so it does not race these HTTP-only tests. Every test uses freshly
 * generated ids so the two client-type runs never collide in the shared container. A direct message
 * exercises the {@code TransactGetItems} fast path and a group larger than one 100-item transaction
 * exercises the {@code META} transaction plus participant {@code Query} fallback.
 */
abstract class AbstractReadConversationSnapshotIntegrationTest {

private static final int DYNAMODB_PORT = 8000;

private static final String ACTOR_HEADER = "X-User-Id";

    private static final String LOCAL_URL_PREFIX = "http://localhost:";

private static final int FAST_PATH_GROUP_SIZE = 99;

private static final int FALLBACK_GROUP_SIZE = 100;

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
    private ConversationRepository conversationRepository;

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
    void readDirectMessageSnapshotReturns200() {
        String alice = createUser();
        String bob = createUser();
        String conversationId = createDirectMessage(alice, bob);

        ResponseEntity<SnapshotBody> response = readSnapshot(alice, conversationId, SnapshotBody.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().conversationId()).isEqualTo(conversationId);
        assertThat(response.getBody().type()).isEqualTo("DIRECT_MESSAGE");
        assertThat(response.getBody().title()).isNull();
        assertThat(response.getBody().participantCount()).isEqualTo(2L);
        assertThat(response.getBody().createdAt()).endsWith("Z");
        assertThat(response.getBody().participants())
                .extracting(ParticipantBody::userId)
                .containsExactlyInAnyOrder(alice, bob);
        assertOrderedByUserId(response.getBody().participants());
    }

    @Test
    void readGroupSnapshotReturns200WithTitleAndOrderedParticipants() {
        String alice = createUser();
        String bob = createUser();
        String carol = createUser();
        String conversationId = createGroup("Study group", List.of(alice, bob, carol));

        ResponseEntity<SnapshotBody> response = readSnapshot(alice, conversationId, SnapshotBody.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().type()).isEqualTo("GROUP");
        assertThat(response.getBody().title()).isEqualTo("Study group");
        assertThat(response.getBody().participantCount()).isEqualTo(3L);
        assertThat(response.getBody().participants())
                .extracting(ParticipantBody::userId)
                .containsExactlyInAnyOrder(alice, bob, carol);
        assertOrderedByUserId(response.getBody().participants());
    }

    @Test
    void readNinetyNineParticipantGroupSnapshotReturnsAllParticipantsViaFastPath() {
        List<String> members = createUsers(FAST_PATH_GROUP_SIZE);
        String conversationId = createGroup("Fast path group", members);

        ResponseEntity<SnapshotBody> response = readSnapshot(members.get(0), conversationId, SnapshotBody.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().participantCount()).isEqualTo((long) FAST_PATH_GROUP_SIZE);
        assertThat(response.getBody().participants())
                .extracting(ParticipantBody::userId)
                .containsExactlyInAnyOrderElementsOf(members);
        assertOrderedByUserId(response.getBody().participants());
    }

    @Test
    void readOneHundredParticipantGroupSnapshotReturnsAllParticipantsViaFallback() {
        List<String> members = createUsers(FALLBACK_GROUP_SIZE);
        String conversationId = createGroup("Fallback group", members);

        ResponseEntity<SnapshotBody> response = readSnapshot(members.get(0), conversationId, SnapshotBody.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().participantCount()).isEqualTo((long) FALLBACK_GROUP_SIZE);
        assertThat(response.getBody().participants())
                .extracting(ParticipantBody::userId)
                .containsExactlyInAnyOrderElementsOf(members);
        assertOrderedByUserId(response.getBody().participants());
    }

    @Test
    void readDuringChunkedCreateIsTransientUntilTheFullProjectionIsActive() {
        List<String> members = List.of(createUser(), createUser(), createUser());
        String conversationId = "conv_" + UUID.randomUUID().toString().replace("-", "");
        String createdAt = "2026-08-07T00:00:00Z";
        ConversationMapper mapper = new ConversationMapper();
        ConversationMeta meta = mapper.toMeta(conversationId, "GROUP", "Creating group", members.size(), createdAt);
        meta.setLifecycleState(ConversationMeta.LIFECYCLE_CREATING);

        // The metadata is visible before either participant chunk or inbox fan-out has completed.
        conversationRepository.createConversation(meta, List.of()).join();
        assertNotReady(members.get(0), conversationId);

        List<ConversationParticipant> participants = members.stream()
                .map(userId -> mapper.toParticipant(conversationId, userId, createdAt))
                .toList();
        conversationRepository.repairParticipants(participants).join();
        // Even with all members present, the create remains unreadable until inbox projection and activation.
        assertNotReady(members.get(0), conversationId);

        List<InboxEntry> inboxEntries = members.stream()
                .map(userId -> mapper.toInboxEntry(userId, conversationId, "GROUP", "Creating group", createdAt,
                        ConversationMapper.PLACEHOLDER_PREVIEW))
                .toList();
        conversationRepository.fanOutInbox(inboxEntries, 25).join();
        conversationRepository.activateConversation(conversationId).join();

        ResponseEntity<SnapshotBody> response = readSnapshot(members.get(0), conversationId, SnapshotBody.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().participantCount()).isEqualTo(3L);
        assertThat(response.getBody().participants()).extracting(ParticipantBody::userId)
                .containsExactlyInAnyOrderElementsOf(members);
    }

    @Test
    void nonParticipantReceives200WithFullSnapshot() {
        String alice = createUser();
        String bob = createUser();
        String outsider = createUser();
        String conversationId = createDirectMessage(alice, bob);

        // This read is not membership-gated: an outsider who knows the id still gets the snapshot.
        ResponseEntity<SnapshotBody> response = readSnapshot(outsider, conversationId, SnapshotBody.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().participants())
                .extracting(ParticipantBody::userId)
                .containsExactlyInAnyOrder(alice, bob);
    }

    @Test
    void readWithoutActorHeaderReturns200() {
        String alice = createUser();
        String bob = createUser();
        String conversationId = createDirectMessage(alice, bob);

        // No X-User-Id header: the snapshot read does not require an actor.
        ResponseEntity<SnapshotBody> response = restTemplate.exchange(
                conversationUrl(conversationId), HttpMethod.GET, HttpEntity.EMPTY, SnapshotBody.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().conversationId()).isEqualTo(conversationId);
    }

    @Test
    void readMalformedIdReturns400ValidationError() {
        ResponseEntity<ErrorBody> response = restTemplate.exchange(
                LOCAL_URL_PREFIX + port + "/api/v1/conversations/bad$id",
                HttpMethod.GET, HttpEntity.EMPTY, ErrorBody.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().error()).isEqualTo("VALIDATION_ERROR");
    }

    @Test
    void readUnknownConversationReturns404ConversationNotFound() {
        String alice = createUser();

        ResponseEntity<ErrorBody> response = readSnapshot(alice, "conv_missing", ErrorBody.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody().error()).isEqualTo("CONVERSATION_NOT_FOUND");
    }

    private static void assertOrderedByUserId(List<ParticipantBody> participants) {
        List<String> ids = participants.stream().map(ParticipantBody::userId).toList();
        List<String> sorted = ids.stream().sorted().toList();
        assertThat(ids).isEqualTo(sorted);
    }

    private String createDirectMessage(String creator, String other) {
        return createConversation(creator,
                "{\"type\":\"DIRECT_MESSAGE\",\"participantUserIds\":" + jsonArray(creator, other) + "}");
    }

    private String createGroup(String title, List<String> members) {
        return createConversation(members.get(0),
                "{\"type\":\"GROUP\",\"title\":\"" + title + "\",\"participantUserIds\":"
                        + jsonArray(members.toArray(String[]::new)) + "}");
    }

    private String createConversation(String actor, String body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.add(ACTOR_HEADER, actor);
        ResponseEntity<ConversationBody> created = restTemplate.exchange(
                LOCAL_URL_PREFIX + port + "/api/v1/conversations",
                HttpMethod.POST, new HttpEntity<>(body, headers), ConversationBody.class);
        assertThat(created.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        return created.getBody().conversationId();
    }

    private <T> ResponseEntity<T> readSnapshot(String actor, String conversationId, Class<T> responseType) {
        HttpHeaders headers = new HttpHeaders();
        headers.add(ACTOR_HEADER, actor);
        return restTemplate.exchange(
                conversationUrl(conversationId), HttpMethod.GET, new HttpEntity<>(headers), responseType);
    }

    /** Asserts the explicit transient contract rather than accepting a partial snapshot. */
    private void assertNotReady(String actor, String conversationId) {
        ResponseEntity<ErrorBody> response = readSnapshot(actor, conversationId, ErrorBody.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
        assertThat(response.getBody().error()).isEqualTo("CONVERSATION_NOT_READY");
    }

    private String createUser() {
        String userId = uniqueUserId();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        String json = "{\"userId\":\"" + userId + "\",\"displayName\":\"" + userId + "\"}";
        ResponseEntity<String> created = restTemplate.postForEntity(
                LOCAL_URL_PREFIX + port + "/api/v1/users", new HttpEntity<>(json, headers), String.class);
        assertThat(created.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        return userId;
    }

    /** Creates the requested number of isolated profile fixtures. */
    private List<String> createUsers(int count) {
        List<String> users = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            users.add(createUser());
        }
        return users;
    }

    private String conversationUrl(String conversationId) {
        return LOCAL_URL_PREFIX + port + "/api/v1/conversations/" + conversationId;
    }

    private static String jsonArray(String... ids) {
        return List.of(ids).stream()
                .map(id -> "\"" + id + "\"")
                .collect(Collectors.joining(",", "[", "]"));
    }

    private static String uniqueUserId() {
        return "user_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
    }

    /** Minimal view of the conversation-create success body. */
    record ConversationBody(String conversationId, String type, String title, long participantCount,
                            String createdAt) {
    }

    /** Minimal view of the snapshot success body. */
    record SnapshotBody(String conversationId, String type, String title, long participantCount,
                        String createdAt, List<ParticipantBody> participants) {
    }

    /** Minimal view of a snapshot participant. */
    record ParticipantBody(String userId, String joinedAt) {
    }

    /** Minimal view of the error envelope. */
    record ErrorBody(String error, String message) {
    }
}
