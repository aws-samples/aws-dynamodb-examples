package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.unit.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.concurrent.CompletableFuture;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.ConversationMeta;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.ConversationParticipant;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.LowLevelDynamoDbConversationRepository;
import software.amazon.awssdk.services.dynamodb.DynamoDbAsyncClient;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;
import software.amazon.awssdk.services.dynamodb.model.TransactWriteItemsRequest;
import software.amazon.awssdk.services.dynamodb.model.TransactWriteItemsResponse;

/**
 * Unit coverage for the conversation-create transaction boundaries.
 *
 * <p>The shared conversation operations back both repository implementations. This test captures
 * the low-level requests to prove the 100-item {@code TransactWriteItems} boundary: 98 members fit
 * one transaction, 99 members fill it, and 100 members start a second chunk. A 199-member group
 * fills two transactions.
 */
@Tag("unit")
@ExtendWith(MockitoExtension.class)
class ConversationCreateRepositoryTest {

    private static final String TABLE = "JavaConversations";
    private static final String CONVERSATION_ID = "conv_transaction_boundary";

    @Mock
    private DynamoDbAsyncClient client;

    @Test
    void createConversation_withNinetyEightParticipants_fitsOneTransactionJustBelowLimit() {
        List<TransactWriteItemsRequest> requests = captureCreate(98);

        assertThat(requests).hasSize(1);
        assertThat(requests.get(0).transactItems()).hasSize(99);
        assertThat(participantIds(requests.get(0))).containsExactlyElementsOf(memberIds(0, 98));
    }

    @Test
    void createConversation_withNinetyNineParticipants_fillsOneHundredItemTransaction() {
        List<TransactWriteItemsRequest> requests = captureCreate(99);

        assertThat(requests).hasSize(1);
        assertThat(requests.get(0).transactItems()).hasSize(100);
        assertThat(participantIds(requests.get(0))).containsExactlyElementsOf(memberIds(0, 99));
    }

    @Test
    void createConversation_withOneHundredParticipants_splitsAfterTheFirstFullTransaction() {
        List<TransactWriteItemsRequest> requests = captureCreate(100);

        assertThat(requests).hasSize(2);
        assertThat(requests.get(0).transactItems()).hasSize(100);
        assertThat(requests.get(1).transactItems()).hasSize(1);
        assertThat(participantIds(requests.get(0))).containsExactlyElementsOf(memberIds(0, 99));
        assertThat(participantIds(requests.get(1))).containsExactlyElementsOf(memberIds(99, 100));
    }

    @Test
    void createConversation_withOneHundredNinetyNineParticipants_createsTwoFullTransactions() {
        List<TransactWriteItemsRequest> requests = captureCreate(199);
        assertThat(requests).hasSize(2);
        assertThat(requests.get(0).transactItems()).hasSize(100);
        assertThat(requests.get(1).transactItems()).hasSize(100);
        assertThat(requests.get(0).transactItems().get(0).put().item())
                .containsEntry("entityType", AttributeValue.fromS(ConversationMeta.ENTITY_TYPE));
        assertThat(participantIds(requests.get(0))).containsExactlyElementsOf(memberIds(0, 99));
        assertThat(participantIds(requests.get(1))).containsExactlyElementsOf(memberIds(99, 199));
    }

    @Test
    void repairParticipants_withOneHundredOneMissingMembers_usesConditionalChunks() {
        ArgumentCaptor<TransactWriteItemsRequest> captor = ArgumentCaptor.forClass(TransactWriteItemsRequest.class);
        when(client.transactWriteItems(captor.capture())).thenReturn(CompletableFuture.completedFuture(
                TransactWriteItemsResponse.builder().build()));

        new LowLevelDynamoDbConversationRepository(client, TABLE)
                .repairParticipants(participants(101))
                .join();

        List<TransactWriteItemsRequest> requests = captor.getAllValues();
        assertThat(requests).hasSize(2);
        assertThat(requests.get(0).transactItems()).hasSize(100);
        assertThat(requests.get(1).transactItems()).hasSize(1);
        assertThat(requests.get(0).transactItems()).allSatisfy(item ->
                assertThat(item.put().conditionExpression()).isEqualTo("attribute_not_exists(SK)"));
    }

    /**
     * Creates a conversation of the given size and returns the captured write transactions.
     *
     * @param participantCount number of members to persist
     * @return captured {@code TransactWriteItems} requests in commit order
     */
    private List<TransactWriteItemsRequest> captureCreate(int participantCount) {
        ArgumentCaptor<TransactWriteItemsRequest> captor = ArgumentCaptor.forClass(TransactWriteItemsRequest.class);
        when(client.transactWriteItems(captor.capture())).thenReturn(CompletableFuture.completedFuture(
                TransactWriteItemsResponse.builder().build()));
        new LowLevelDynamoDbConversationRepository(client, TABLE)
                .createConversation(meta(), participants(participantCount))
                .join();
        return captor.getAllValues();
    }

    /** Builds metadata for the transaction-boundary fixture. */
    private static ConversationMeta meta() {
        ConversationMeta meta = new ConversationMeta();
        meta.setPk(ConversationMeta.partitionKey(CONVERSATION_ID));
        meta.setSk(ConversationMeta.SORT_KEY);
        meta.setEntityType(ConversationMeta.ENTITY_TYPE);
        meta.setConversationId(CONVERSATION_ID);
        meta.setType("GROUP");
        meta.setParticipantCount(199L);
        meta.setCreatedAt("2026-01-04T00:00:00Z");
        return meta;
    }

    /** Builds the requested number of ordered conversation-participant fixtures. */
    private static List<ConversationParticipant> participants(int count) {
        List<ConversationParticipant> participants = new ArrayList<>();
        for (String userId : memberIds(0, count)) {
            ConversationParticipant participant = new ConversationParticipant();
            participant.setPk(ConversationParticipant.PK_PREFIX + CONVERSATION_ID);
            participant.setSk(ConversationParticipant.sortKey(userId));
            participant.setEntityType(ConversationParticipant.ENTITY_TYPE);
            participant.setUserId(userId);
            participant.setJoinedAt("2026-01-04T00:00:00Z");
            participants.add(participant);
        }
        return participants;
    }

    /** Extracts participant ids from a transaction request that may begin with metadata. */
    private static List<String> participantIds(TransactWriteItemsRequest request) {
        return request.transactItems().stream()
                .map(item -> item.put().item().get("userId"))
                .filter(Objects::nonNull)
                .map(value -> value.s())
                .toList();
    }

    /** Returns ordered fixture user ids in the half-open range {@code [start, end)}. */
    private static List<String> memberIds(int start, int end) {
        List<String> userIds = new ArrayList<>();
        for (int index = start; index < end; index++) {
            userIds.add(String.format("user_%03d", index));
        }
        return userIds;
    }
}
