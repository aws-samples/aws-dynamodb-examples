package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.unit.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.ConversationMeta;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.ConversationParticipant;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.ConversationSnapshot;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.LowLevelDynamoDbConversationRepository;
import software.amazon.awssdk.services.dynamodb.DynamoDbAsyncClient;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;
import software.amazon.awssdk.services.dynamodb.model.ItemResponse;
import software.amazon.awssdk.services.dynamodb.model.QueryRequest;
import software.amazon.awssdk.services.dynamodb.model.QueryResponse;
import software.amazon.awssdk.services.dynamodb.model.TransactGetItemsRequest;
import software.amazon.awssdk.services.dynamodb.model.TransactGetItemsResponse;

/**
 * Unit coverage for the operation 10 snapshot read path selection. No Docker is
 * required: the low-level async client is mocked so the {@code TransactGetItems} fast path and the
 * {@code Query} fallback branches are asserted directly by inspecting the requests the repository
 * issues. Both repository implementations delegate to the same shared operations, so exercising the
 * low-level one proves the branch logic for both client types.
 */
@Tag("unit")
@ExtendWith(MockitoExtension.class)
class ConversationSnapshotRepositoryTest {

    private static final String TABLE = "JavaConversations";
    private static final String TS = "2026-01-04T00:00:00Z";

    @Mock
    private DynamoDbAsyncClient client;

    @Test
    void directMessageUsesTransactGetItemsFastPath() {
        String conversationId = "conv_alice_bob";
        stubParticipantQuery(conversationId, List.of("user_alice", "user_bob"));
        ArgumentCaptor<TransactGetItemsRequest> captor = stubTransactGet(
                metaItem(conversationId, "DIRECT_MESSAGE", null, 2),
                participantItem(conversationId, "user_alice"),
                participantItem(conversationId, "user_bob"));

        ConversationSnapshot snapshot =
                new LowLevelDynamoDbConversationRepository(client, TABLE).getSnapshot(conversationId).join();

        assertThat(snapshot.meta()).isNotNull();
        assertThat(snapshot.participants()).hasSize(2);
        // The fast path loads META plus every participant in one transaction (1 + 2 items).
        assertThat(captor.getValue().transactItems()).hasSize(3);
        verify(client, times(1)).transactGetItems(any(TransactGetItemsRequest.class));
    }

    @Test
    void snapshotWithNinetyEightParticipantsUsesNinetyNineItemTransactionFastPath() {
        String conversationId = "conv_just_below_boundary";
        List<String> members = memberIds(98);
        stubParticipantQuery(conversationId, members);
        List<Map<String, AttributeValue>> items = new ArrayList<>();
        items.add(metaItem(conversationId, "GROUP", "Just below", members.size()));
        for (String member : members) {
            items.add(participantItem(conversationId, member));
        }
        ArgumentCaptor<TransactGetItemsRequest> captor = stubTransactGet(items);

        ConversationSnapshot snapshot =
                new LowLevelDynamoDbConversationRepository(client, TABLE).getSnapshot(conversationId).join();

        assertThat(snapshot.participants()).hasSize(98);
        assertThat(captor.getValue().transactItems()).hasSize(99);
    }

    @Test
    void snapshotWithNinetyNineParticipantsUsesOneHundredItemTransactionFastPath() {
        String conversationId = "conv_boundary_group";
        List<String> members = memberIds(99);
        stubParticipantQuery(conversationId, members);
        List<Map<String, AttributeValue>> items = new ArrayList<>();
        items.add(metaItem(conversationId, "GROUP", "Boundary group", members.size()));
        for (String member : members) {
            items.add(participantItem(conversationId, member));
        }
        ArgumentCaptor<TransactGetItemsRequest> captor = stubTransactGet(items);

        ConversationSnapshot snapshot =
                new LowLevelDynamoDbConversationRepository(client, TABLE).getSnapshot(conversationId).join();

        assertThat(snapshot.participants()).hasSize(99);
        assertThat(captor.getValue().transactItems()).hasSize(100);
    }

    @Test
    void snapshotWithOneHundredParticipantsFallsBackToMetaTransactionPlusParticipantQuery() {
        String conversationId = "conv_big_group";
        List<String> members = memberIds(100);
        stubParticipantQuery(conversationId, members);
        ArgumentCaptor<TransactGetItemsRequest> captor =
                stubTransactGet(metaItem(conversationId, "GROUP", "Big group", members.size()));

        ConversationSnapshot snapshot =
                new LowLevelDynamoDbConversationRepository(client, TABLE).getSnapshot(conversationId).join();

        assertThat(snapshot.meta()).isNotNull();
        // The participant list comes from the discovery Query, not the transaction.
        assertThat(snapshot.participants()).hasSize(100);
        // The fallback transaction reads META only (a single item).
        assertThat(captor.getValue().transactItems()).hasSize(1);
        verify(client, times(1)).query(any(QueryRequest.class));
    }

    @Test
    void missingConversationYieldsNullMeta() {
        String conversationId = "conv_missing";
        stubParticipantQuery(conversationId, List.of());
        // The fast path requests only META (no participants); DynamoDB returns one empty ItemResponse.
        stubTransactGet(Map.of());

        ConversationSnapshot snapshot =
                new LowLevelDynamoDbConversationRepository(client, TABLE).getSnapshot(conversationId).join();

        assertThat(snapshot.meta()).isNull();
        assertThat(snapshot.participants()).isEmpty();
    }

    private void stubParticipantQuery(String conversationId, List<String> userIds) {
        List<Map<String, AttributeValue>> items = new ArrayList<>();
        for (String userId : userIds) {
            items.add(participantItem(conversationId, userId));
        }
        when(client.query(any(QueryRequest.class))).thenReturn(CompletableFuture.completedFuture(
                QueryResponse.builder().items(items).build()));
    }

    /** Returns deterministic participant ids for the requested group size. */
    private static List<String> memberIds(int count) {
        List<String> members = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            members.add(String.format("user_%02d", i));
        }
        return members;
    }

    /** Stubs the transactional read and returns a captor over the issued request. */
    @SafeVarargs
    private final ArgumentCaptor<TransactGetItemsRequest> stubTransactGet(
            Map<String, AttributeValue>... itemsInOrder) {
        return stubTransactGet(List.of(itemsInOrder));
    }

    /** Stubs the transactional read from an ordered response item list. */
    private ArgumentCaptor<TransactGetItemsRequest> stubTransactGet(List<Map<String, AttributeValue>> itemsInOrder) {
        List<ItemResponse> responses = new ArrayList<>();
        for (Map<String, AttributeValue> item : itemsInOrder) {
            responses.add(ItemResponse.builder().item(item).build());
        }
        ArgumentCaptor<TransactGetItemsRequest> captor = ArgumentCaptor.forClass(TransactGetItemsRequest.class);
        when(client.transactGetItems(captor.capture())).thenReturn(CompletableFuture.completedFuture(
                TransactGetItemsResponse.builder().responses(responses).build()));
        return captor;
    }

    private static Map<String, AttributeValue> metaItem(String conversationId, String type, String title,
                                                        long participantCount) {
        Map<String, AttributeValue> item = new LinkedHashMap<>();
        item.put("PK", AttributeValue.fromS(ConversationMeta.partitionKey(conversationId)));
        item.put("SK", AttributeValue.fromS(ConversationMeta.SORT_KEY));
        item.put("entityType", AttributeValue.fromS(ConversationMeta.ENTITY_TYPE));
        item.put("conversationId", AttributeValue.fromS(conversationId));
        item.put("type", AttributeValue.fromS(type));
        if (title != null) {
            item.put("title", AttributeValue.fromS(title));
        }
        item.put("participantCount", AttributeValue.fromN(Long.toString(participantCount)));
        item.put("createdAt", AttributeValue.fromS(TS));
        return item;
    }

    private static Map<String, AttributeValue> participantItem(String conversationId, String userId) {
        Map<String, AttributeValue> item = new LinkedHashMap<>();
        item.put("PK", AttributeValue.fromS(ConversationParticipant.PK_PREFIX + conversationId));
        item.put("SK", AttributeValue.fromS(ConversationParticipant.sortKey(userId)));
        item.put("entityType", AttributeValue.fromS(ConversationParticipant.ENTITY_TYPE));
        item.put("userId", AttributeValue.fromS(userId));
        item.put("joinedAt", AttributeValue.fromS(TS));
        return item;
    }
}
