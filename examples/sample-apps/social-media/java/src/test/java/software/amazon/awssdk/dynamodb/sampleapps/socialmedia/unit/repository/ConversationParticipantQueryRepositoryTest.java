package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.unit.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

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
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.ConversationParticipant;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.LowLevelDynamoDbConversationRepository;
import software.amazon.awssdk.services.dynamodb.DynamoDbAsyncClient;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;
import software.amazon.awssdk.services.dynamodb.model.QueryRequest;
import software.amazon.awssdk.services.dynamodb.model.QueryResponse;
import software.amazon.awssdk.services.dynamodb.model.TransactGetItemsRequest;

/**
 * Unit coverage for the participant-only conversation query. No Docker is required. The low-level
 * async client is mocked so pagination through {@code ExclusiveStartKey} and the absence of
 * {@code TransactGetItems} are asserted directly. Both repository implementations delegate to the
 * same shared operations, so exercising the low-level one proves the query contract for both client
 * types.
 */
@Tag("unit")
@ExtendWith(MockitoExtension.class)
class ConversationParticipantQueryRepositoryTest {

    private static final String TABLE = "JavaConversations";
    private static final String TS = "2026-01-04T00:00:00Z";

    @Mock
    private DynamoDbAsyncClient client;

    @Test
    void queryParticipants_whenTwoPages_drainsEveryMemberWithoutTransactGet() {
        String conversationId = "conv_paged";
        Map<String, AttributeValue> lastKey = lastEvaluatedKey(conversationId, "user_alice");
        when(client.query(any(QueryRequest.class))).thenAnswer(invocation -> {
            QueryRequest request = invocation.getArgument(0);
            if (!request.hasExclusiveStartKey()) {
                return CompletableFuture.completedFuture(QueryResponse.builder()
                        .items(List.of(participantItem(conversationId, "user_alice")))
                        .lastEvaluatedKey(lastKey)
                        .build());
            }
            return CompletableFuture.completedFuture(QueryResponse.builder()
                    .items(List.of(participantItem(conversationId, "user_bob")))
                    .build());
        });

        List<ConversationParticipant> participants =
                new LowLevelDynamoDbConversationRepository(client, TABLE)
                        .queryParticipants(conversationId).join();

        assertThat(participants).extracting(ConversationParticipant::getUserId)
                .containsExactly("user_alice", "user_bob");
        ArgumentCaptor<QueryRequest> captor = ArgumentCaptor.forClass(QueryRequest.class);
        verify(client, times(2)).query(captor.capture());
        List<QueryRequest> requests = captor.getAllValues();
        assertThat(requests).allMatch(QueryRequest::consistentRead);
        assertThat(requests).allMatch(request -> Integer.valueOf(100).equals(request.limit()));
        assertThat(requests.get(0).hasExclusiveStartKey()).isFalse();
        assertThat(requests.get(1).exclusiveStartKey()).isEqualTo(lastKey);
        verify(client, never()).transactGetItems(any(TransactGetItemsRequest.class));
    }

    @Test
    void queryParticipants_whenConversationMissing_returnsEmptyWithoutTransactGet() {
        String conversationId = "conv_missing";
        when(client.query(any(QueryRequest.class))).thenReturn(CompletableFuture.completedFuture(
                QueryResponse.builder().items(List.of()).build()));

        List<ConversationParticipant> participants =
                new LowLevelDynamoDbConversationRepository(client, TABLE)
                        .queryParticipants(conversationId).join();

        assertThat(participants).isEmpty();
        verify(client, times(1)).query(any(QueryRequest.class));
        verify(client, never()).transactGetItems(any(TransactGetItemsRequest.class));
    }

    /**
     * Builds the exclusive-start key DynamoDB would return after the first participant page.
     *
     * @param conversationId conversation partition
     * @param userId         last user on the completed page
     * @return exclusive-start key map
     */
    private static Map<String, AttributeValue> lastEvaluatedKey(String conversationId, String userId) {
        Map<String, AttributeValue> lastKey = new LinkedHashMap<>();
        lastKey.put("PK", AttributeValue.fromS(ConversationParticipant.PK_PREFIX + conversationId));
        lastKey.put("SK", AttributeValue.fromS(ConversationParticipant.sortKey(userId)));
        return lastKey;
    }

    /**
     * Builds a participant item image for the mocked query page.
     *
     * @param conversationId conversation partition
     * @param userId         member id
     * @return DynamoDB item map
     */
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
