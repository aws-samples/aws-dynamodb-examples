package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.integration.messaging;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.atomic.AtomicInteger;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Proxy;
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
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.ConversationParticipant;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.InboxEntry;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.exception.BatchWriteRetryExhaustedException;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.ConversationRepository;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.MessageRepository;
import software.amazon.awssdk.services.dynamodb.DynamoDbAsyncClient;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;
import software.amazon.awssdk.services.dynamodb.model.DeleteItemRequest;
import software.amazon.awssdk.services.dynamodb.model.BatchWriteItemRequest;
import software.amazon.awssdk.services.dynamodb.model.BatchWriteItemResponse;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.mapper.ConversationMapper;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.ConversationMeta;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.HighLevelDynamoDbConversationRepository;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.LowLevelDynamoDbConversationRepository;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.LowLevelDynamoDbMessageRepository;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.mapper.MessageMapper;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.Message;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbEnhancedAsyncClient;

/**
 *  conversation-create and message-send integration tests booting the full web application
 * against DynamoDB Local.
 *
 * <p>The same scenarios run for every {@code dynamodb.client-type} via the concrete subclasses so
 * both access styles create identical conversation, participant, and inbox rows and produce
 * identical HTTP outcomes. A single DynamoDB Local container is shared across the client-type
 * subclasses (singleton pattern) and the streams poller is disabled so it does not race these
 * HTTP-only tests. Every test uses freshly generated ids so the two
 * client-type runs never collide in the shared container. A group larger than one 25-item batch
 * confirms conversation create and inbox fan-out page across chunks.
 */
abstract class AbstractSendMessageIntegrationTest {

private static final int DYNAMODB_PORT = 8000;

private static final String ACTOR_HEADER = "X-User-Id";

private static final int LARGE_GROUP_SIZE = 199;

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
    private MessageRepository messageRepository;

    @Autowired
    private ConversationRepository conversationRepository;

    @Autowired
    private DynamoDbAsyncClient dynamoDbClient;

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
    void createDirectMessageReturns201() {
        String alice = createUser();
        String carol = createUser();

        ResponseEntity<ConversationBody> response = createConversation(alice,
                "{\"type\":\"DIRECT_MESSAGE\",\"participantUserIds\":" + jsonArray(alice, carol) + "}",
                ConversationBody.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().conversationId()).startsWith("conv_");
        assertThat(response.getBody().type()).isEqualTo("DIRECT_MESSAGE");
        assertThat(response.getBody().title()).isNull();
        assertThat(response.getBody().participantCount()).isEqualTo(2L);
    }

    @Test
    void createGroupReturns201WithTitle() {
        String alice = createUser();
        String bob = createUser();
        String carol = createUser();

        ResponseEntity<ConversationBody> response = createConversation(alice,
                "{\"type\":\"GROUP\",\"title\":\"Weekend hike\",\"participantUserIds\":"
                        + jsonArray(alice, bob, carol) + "}",
                ConversationBody.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody().type()).isEqualTo("GROUP");
        assertThat(response.getBody().title()).isEqualTo("Weekend hike");
        assertThat(response.getBody().participantCount()).isEqualTo(3L);
    }

    @Test
    void createConversation_withMissingPersistedMemberAndInbox_replayRepairsBoth() {
        String alice = createUser();
        String bob = createUser();
        String carol = createUser();
        String clientRequestId = uniqueClientRequestId("conversation_replay");
        String body = "{\"type\":\"GROUP\",\"title\":\"Weekend hike\",\"clientRequestId\":\""
                + clientRequestId + "\",\"participantUserIds\":" + jsonArray(alice, bob, carol) + "}";
        ResponseEntity<ConversationBody> created = createConversation(alice, body, ConversationBody.class);
        String conversationId = created.getBody().conversationId();
        deleteConversationItem(ConversationParticipant.PK_PREFIX + conversationId,
                ConversationParticipant.sortKey(carol));
        deleteConversationItem(InboxEntry.partitionKey(carol), InboxEntry.sortKey(conversationId));

        ResponseEntity<ConversationBody> replay = createConversation(alice, body, ConversationBody.class);

        assertThat(replay.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(replay.getBody().conversationId()).isEqualTo(conversationId);
        assertThat(conversationRepository.getSnapshot(conversationId).join().participants())
                .extracting(ConversationParticipant::getUserId)
                .containsExactlyInAnyOrder(alice, bob, carol);
        assertThat(conversationRepository.queryInbox(carol, "GROUP", 10, false, null).join().items())
                .extracting(InboxEntry::getConversationId)
                .contains(conversationId);
    }

    @Test
    void repositoryWrites_withPostCommitFailures_repairEveryTransactionAndInboxBatchBoundary() {
        for (int failureCall = 1; failureCall <= 2; failureCall++) {
            verifyConversationChunkRecovery(new LowLevelDynamoDbConversationRepository(
                    failAfterCommit("transactWriteItems", failureCall), "JavaConversations"), failureCall);
            DynamoDbEnhancedAsyncClient enhanced = DynamoDbEnhancedAsyncClient.builder()
                    .dynamoDbClient(failAfterCommit("transactWriteItems", failureCall))
                    .build();
            verifyConversationChunkRecovery(new HighLevelDynamoDbConversationRepository(enhanced,
                    "JavaConversations"), failureCall);
        }
        for (int failureCall = 1; failureCall <= 2; failureCall++) {
            verifyInboxBatchRecovery(new LowLevelDynamoDbConversationRepository(
                    failAfterCommit("batchWriteItem", failureCall), "JavaConversations"), failureCall);
            DynamoDbEnhancedAsyncClient enhanced = DynamoDbEnhancedAsyncClient.builder()
                    .dynamoDbClient(failAfterCommit("batchWriteItem", failureCall))
                    .build();
            verifyInboxBatchRecovery(new HighLevelDynamoDbConversationRepository(enhanced,
                    "JavaConversations"), failureCall);
        }
        verifyMessageSourceRecovery();
        verifyExhaustedInboxFanOut();
    }

    @Test
    void createInvalidTypeReturns400InvalidConversationType() {
        String alice = createUser();
        String carol = createUser();

        ResponseEntity<ErrorBody> response = createConversation(alice,
                "{\"type\":\"CHANNEL\",\"participantUserIds\":" + jsonArray(alice, carol) + "}",
                ErrorBody.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().error()).isEqualTo("INVALID_CONVERSATION_TYPE");
    }

    @Test
    void createDirectMessageWithThreeParticipantsReturns400InvalidParticipantCount() {
        String alice = createUser();
        String bob = createUser();
        String carol = createUser();

        ResponseEntity<ErrorBody> response = createConversation(alice,
                "{\"type\":\"DIRECT_MESSAGE\",\"participantUserIds\":" + jsonArray(alice, bob, carol) + "}",
                ErrorBody.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().error()).isEqualTo("INVALID_PARTICIPANT_COUNT");
    }

    @Test
    void createDuplicateParticipantsReturns400InvalidParticipantCount() {
        String alice = createUser();

        ResponseEntity<ErrorBody> response = createConversation(alice,
                "{\"type\":\"DIRECT_MESSAGE\",\"participantUserIds\":" + jsonArray(alice, alice) + "}",
                ErrorBody.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().error()).isEqualTo("INVALID_PARTICIPANT_COUNT");
    }

    @Test
    void createTitleOnDirectMessageReturns400ValidationError() {
        String alice = createUser();
        String carol = createUser();

        ResponseEntity<ErrorBody> response = createConversation(alice,
                "{\"type\":\"DIRECT_MESSAGE\",\"title\":\"Nope\",\"participantUserIds\":"
                        + jsonArray(alice, carol) + "}",
                ErrorBody.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().error()).isEqualTo("VALIDATION_ERROR");
    }

    @Test
    void createCreatorNotIncludedReturns400ValidationError() {
        String alice = createUser();
        String bob = createUser();
        String carol = createUser();

        ResponseEntity<ErrorBody> response = createConversation(alice,
                "{\"type\":\"DIRECT_MESSAGE\",\"participantUserIds\":" + jsonArray(bob, carol) + "}",
                ErrorBody.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().error()).isEqualTo("VALIDATION_ERROR");
    }

    @Test
    void createUnknownParticipantReturns404UserNotFound() {
        String alice = createUser();
        String ghost = uniqueUserId();

        ResponseEntity<ErrorBody> response = createConversation(alice,
                "{\"type\":\"DIRECT_MESSAGE\",\"participantUserIds\":" + jsonArray(alice, ghost) + "}",
                ErrorBody.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody().error()).isEqualTo("USER_NOT_FOUND");
    }

    @Test
    void createMissingActorReturns400ValidationError() {
        String alice = createUser();
        String carol = createUser();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        ResponseEntity<ErrorBody> response = restTemplate.exchange(
                conversationsUrl(), HttpMethod.POST,
                new HttpEntity<>("{\"type\":\"DIRECT_MESSAGE\",\"participantUserIds\":"
                        + jsonArray(alice, carol) + "}", headers),
                ErrorBody.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().error()).isEqualTo("VALIDATION_ERROR");
    }

    @Test
    void sendMessageReturns201() {
        String alice = createUser();
        String carol = createUser();
        String conversationId = createDirectMessage(alice, carol);

        ResponseEntity<MessageBody> response = sendMessage(alice, conversationId,
                "{\"text\":\"Are you free?\"}", MessageBody.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody().messageId()).startsWith("msg_");
        assertThat(response.getBody().conversationId()).isEqualTo(conversationId);
        assertThat(response.getBody().senderId()).isEqualTo(alice);
        assertThat(response.getBody().text()).isEqualTo("Are you free?");
        assertThat(response.getBody().createdAt()).endsWith("Z");
    }

    @Test
    void sendMessage_withSameClientRequestId_replaysOnePersistedMessage() {
        String alice = createUser();
        String carol = createUser();
        String conversationId = createDirectMessage(alice, carol);
        String body = "{\"text\":\"Are you free?\",\"clientRequestId\":\"" + uniqueClientRequestId("message_replay") + "\"}";

        ResponseEntity<MessageBody> first = sendMessage(alice, conversationId, body, MessageBody.class);
        ResponseEntity<MessageBody> replay = sendMessage(alice, conversationId, body, MessageBody.class);

        assertThat(first.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(replay.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(replay.getBody().messageId()).isEqualTo(first.getBody().messageId());
        assertThat(messageRepository.queryMessages(conversationId).join()).hasSize(1);
    }

    @Test
    void sendMessage_withMissingPersistedInbox_replayRepairsProjection() {
        String alice = createUser();
        String carol = createUser();
        String conversationId = createDirectMessage(alice, carol);
        String body = "{\"text\":\"Are you free?\",\"clientRequestId\":\"" + uniqueClientRequestId("message_repair") + "\"}";
        ResponseEntity<MessageBody> first = sendMessage(alice, conversationId, body, MessageBody.class);
        deleteConversationItem(InboxEntry.partitionKey(carol), InboxEntry.sortKey(conversationId));

        ResponseEntity<MessageBody> replay = sendMessage(alice, conversationId, body, MessageBody.class);

        assertThat(replay.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(replay.getBody().messageId()).isEqualTo(first.getBody().messageId());
        assertThat(messageRepository.queryMessages(conversationId).join()).hasSize(1);
        assertThat(conversationRepository.queryInbox(carol, "DIRECT_MESSAGE", 10, false, null).join().items())
                .extracting(InboxEntry::getConversationId)
                .contains(conversationId);
    }

    @Test
    void sendMessageByNonParticipantReturns400NotAParticipant() {
        String alice = createUser();
        String carol = createUser();
        String outsider = createUser();
        String conversationId = createDirectMessage(alice, carol);

        ResponseEntity<ErrorBody> response = sendMessage(outsider, conversationId,
                "{\"text\":\"Let me in\"}", ErrorBody.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().error()).isEqualTo("NOT_A_PARTICIPANT");
    }

    @Test
    void sendMessageToUnknownConversationReturns404ConversationNotFound() {
        String alice = createUser();

        ResponseEntity<ErrorBody> response = sendMessage(alice, "conv_missing",
                "{\"text\":\"Anyone there?\"}", ErrorBody.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody().error()).isEqualTo("CONVERSATION_NOT_FOUND");
    }

    @Test
    void sendMessageMissingActorReturns400ValidationError() {
        String alice = createUser();
        String carol = createUser();
        String conversationId = createDirectMessage(alice, carol);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        ResponseEntity<ErrorBody> response = restTemplate.exchange(
                messagesUrl(conversationId), HttpMethod.POST,
                new HttpEntity<>("{\"text\":\"Hi\"}", headers), ErrorBody.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().error()).isEqualTo("VALIDATION_ERROR");
    }

    @Test
    void sendMessageWithMalformedConversationIdReturns400ValidationError() {
        String alice = createUser();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.add(ACTOR_HEADER, alice);

        ResponseEntity<ErrorBody> response = restTemplate.exchange(
                "http://localhost:" + port + "/api/v1/conversations/bad$id/messages",
                HttpMethod.POST, new HttpEntity<>("{\"text\":\"Hi\"}", headers), ErrorBody.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().error()).isEqualTo("VALIDATION_ERROR");
    }

    @Test
    void createConversation_withTransactionBoundaryGroup_createsEveryParticipantAndFansOutMessage() {
        List<String> members = new ArrayList<>();
        for (int i = 0; i < LARGE_GROUP_SIZE; i++) {
            members.add(createUser());
        }
        String creator = members.get(0);

        ResponseEntity<ConversationBody> created = createConversation(creator,
                "{\"type\":\"GROUP\",\"title\":\"Big group\",\"participantUserIds\":"
                        + jsonArray(members.toArray(String[]::new)) + "}",
                ConversationBody.class);

        assertThat(created.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(created.getBody().participantCount()).isEqualTo((long) LARGE_GROUP_SIZE);

        ResponseEntity<MessageBody> sent = sendMessage(creator, created.getBody().conversationId(),
                "{\"text\":\"Hello everyone\"}", MessageBody.class);

        assertThat(sent.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(sent.getBody().conversationId()).isEqualTo(created.getBody().conversationId());
    }

    private String createDirectMessage(String creator, String other) {
        ResponseEntity<ConversationBody> created = createConversation(creator,
                "{\"type\":\"DIRECT_MESSAGE\",\"participantUserIds\":" + jsonArray(creator, other) + "}",
                ConversationBody.class);
        assertThat(created.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        return created.getBody().conversationId();
    }

    private <T> ResponseEntity<T> createConversation(String actor, String body, Class<T> responseType) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.add(ACTOR_HEADER, actor);
        return restTemplate.exchange(
                conversationsUrl(), HttpMethod.POST, new HttpEntity<>(body, headers), responseType);
    }

    private <T> ResponseEntity<T> sendMessage(String actor, String conversationId, String body,
                                              Class<T> responseType) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.add(ACTOR_HEADER, actor);
        return restTemplate.exchange(
                messagesUrl(conversationId), HttpMethod.POST, new HttpEntity<>(body, headers), responseType);
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

    /** Removes one persisted projection or member row to exercise replay repair with DynamoDB Local. */
    private void deleteConversationItem(String pk, String sk) {
        dynamoDbClient.deleteItem(DeleteItemRequest.builder()
                .tableName("JavaConversations")
                .key(Map.of("PK", AttributeValue.fromS(pk), "SK", AttributeValue.fromS(sk)))
                .build()).join();
    }

    /** Verifies retry repair after a selected 199-member creation transaction has committed but failed its caller. */
    private void verifyConversationChunkRecovery(ConversationRepository faultingRepository, int failureCall) {
        String conversationId = "conv_fault_tx_" + failureCall + "_" + UUID.randomUUID().toString().replace("-", "");
        ConversationMapper mapper = new ConversationMapper();
        List<ConversationParticipant> participants = new ArrayList<>();
        for (int index = 0; index < LARGE_GROUP_SIZE; index++) {
            participants.add(mapper.toParticipant(conversationId, "fault_member_" + index, "2026-08-07T10:00:00Z"));
        }
        ConversationMeta meta = mapper.toMeta(conversationId, "GROUP", "Fault test", LARGE_GROUP_SIZE,
                "2026-08-07T10:00:00Z");

        assertThatThrownBy(() -> faultingRepository.createConversation(meta, participants).join())
                .hasCauseInstanceOf(IllegalStateException.class);

        List<ConversationParticipant> persisted = conversationRepository.getSnapshot(conversationId).join().participants();
        List<ConversationParticipant> missing = participants.stream()
                .filter(expected -> persisted.stream().noneMatch(actual -> actual.getUserId().equals(expected.getUserId())))
                .toList();
        conversationRepository.repairParticipants(missing).join();
        assertThat(conversationRepository.getSnapshot(conversationId).join().participants()).hasSize(LARGE_GROUP_SIZE);
    }

    /** Verifies retry repair after either of two inbox BatchWriteItem calls has committed but failed its caller. */
    private void verifyInboxBatchRecovery(ConversationRepository faultingRepository, int failureCall) {
        String conversationId = "conv_fault_batch_" + failureCall + "_" + UUID.randomUUID().toString().replace("-", "");
        ConversationMapper mapper = new ConversationMapper();
        List<InboxEntry> entries = new ArrayList<>();
        for (int index = 0; index < 30; index++) {
            entries.add(mapper.toInboxEntry("fault_inbox_" + failureCall + "_" + index, conversationId,
                    "GROUP", "Fault test", "2026-08-07T10:00:00Z", ""));
        }

        assertThatThrownBy(() -> faultingRepository.fanOutInbox(entries, 25).join())
                .hasCauseInstanceOf(IllegalStateException.class);
        conversationRepository.fanOutInbox(entries, 25).join();
        assertThat(conversationRepository.queryInbox("fault_inbox_" + failureCall + "_29", "GROUP", 10, false, null)
                .join().items()).extracting(InboxEntry::getConversationId).contains(conversationId);
    }

    /** Verifies a replayable message source transaction remains discoverable after its caller fails. */
    private void verifyMessageSourceRecovery() {
        String conversationId = "conv_fault_message_" + UUID.randomUUID().toString().replace("-", "");
        MessageMapper mapper = new MessageMapper();
        Message message = mapper.toMessage("msg_fault_" + UUID.randomUUID().toString().replace("-", ""),
                conversationId, "fault_sender", "Fault test", "2026-08-07T10:00:00Z");
        LowLevelDynamoDbMessageRepository faulting = new LowLevelDynamoDbMessageRepository(
                failAfterCommit("transactWriteItems", 1), "JavaMessages");

        assertThatThrownBy(() -> faulting.putMessageWithRequest(message,
                mapper.toRequest(message, "fault-fingerprint")).join()).hasCauseInstanceOf(IllegalStateException.class);
        assertThat(messageRepository.getMessageRequest(conversationId, message.getMessageId()).join()).isNotNull();
        assertThat(messageRepository.queryMessages(conversationId).join()).hasSize(1);
    }

    /** Verifies an exhausted unprocessed-items response fails the caller after DynamoDB has accepted the row. */
    private void verifyExhaustedInboxFanOut() {
        String conversationId = "conv_fault_exhausted_" + UUID.randomUUID().toString().replace("-", "");
        InboxEntry entry = new ConversationMapper().toInboxEntry("fault_exhausted", conversationId,
                "GROUP", "Fault test", "2026-08-07T10:00:00Z", "");
        ConversationRepository faulting = new LowLevelDynamoDbConversationRepository(
                alwaysUnprocessedBatches(), "JavaConversations");

        assertThatThrownBy(() -> faulting.fanOutInbox(List.of(entry), 25).join())
                .hasCauseInstanceOf(BatchWriteRetryExhaustedException.class);
        conversationRepository.fanOutInbox(List.of(entry), 25).join();
        assertThat(conversationRepository.queryInbox("fault_exhausted", "GROUP", 10, false, null).join().items())
                .extracting(InboxEntry::getConversationId).contains(conversationId);
    }

    /** Wraps the real async client and fails one operation only after DynamoDB Local has completed it. */
    private DynamoDbAsyncClient failAfterCommit(String operation, int failureCall) {
        AtomicInteger calls = new AtomicInteger();
        return (DynamoDbAsyncClient) Proxy.newProxyInstance(getClass().getClassLoader(),
                new Class<?>[] {DynamoDbAsyncClient.class}, (proxy, method, args) -> {
                    try {
                        Object result = method.invoke(dynamoDbClient, args);
                        if (!operation.equals(method.getName()) || !(result instanceof CompletableFuture<?> future)) {
                            return result;
                        }
                        return future.thenCompose(response -> calls.incrementAndGet() == failureCall
                                ? CompletableFuture.failedFuture(new IllegalStateException("post-commit injected failure"))
                                : CompletableFuture.completedFuture(response));
                    } catch (InvocationTargetException exception) {
                        throw exception.getCause();
                    }
                });
    }

    /** Returns successful DynamoDB writes as unprocessed until the application retry budget is exhausted. */
    private DynamoDbAsyncClient alwaysUnprocessedBatches() {
        return (DynamoDbAsyncClient) Proxy.newProxyInstance(getClass().getClassLoader(),
                new Class<?>[] {DynamoDbAsyncClient.class}, (proxy, method, args) -> {
                    try {
                        Object result = method.invoke(dynamoDbClient, args);
                        if (!"batchWriteItem".equals(method.getName()) || !(result instanceof CompletableFuture<?> future)) {
                            return result;
                        }
                        BatchWriteItemRequest request = (BatchWriteItemRequest) args[0];
                        return future.thenApply(ignored -> BatchWriteItemResponse.builder()
                                .unprocessedItems(request.requestItems()).build());
                    } catch (InvocationTargetException exception) {
                        throw exception.getCause();
                    }
                });
    }

    private String conversationsUrl() {
        return "http://localhost:" + port + "/api/v1/conversations";
    }

    private String messagesUrl(String conversationId) {
        return conversationsUrl() + "/" + conversationId + "/messages";
    }

    private static String jsonArray(String... ids) {
        return List.of(ids).stream()
                .map(id -> "\"" + id + "\"")
                .collect(Collectors.joining(",", "[", "]"));
    }

    private static String uniqueUserId() {
        return "user_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
    }

    private static String uniqueClientRequestId(String prefix) {
        return prefix + "_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
    }

    /** Minimal view of the conversation-create success body. */
    record ConversationBody(String conversationId, String type, String title, long participantCount,
                            String createdAt) {
    }

    /** Minimal view of the message-send success body. */
    record MessageBody(String messageId, String conversationId, String senderId, String text,
                       String createdAt) {
    }

    /** Minimal view of the error envelope. */
    record ErrorBody(String error, String message) {
    }
}
