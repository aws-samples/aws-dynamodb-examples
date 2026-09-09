package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.unit.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.exception.InvalidPaginationTokenException;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.InboxPage;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.LowLevelDynamoDbConversationRepository;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.LowLevelDynamoDbTimelineRepository;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.util.PaginationTokenCodec;
import software.amazon.awssdk.services.dynamodb.DynamoDbAsyncClient;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;
import software.amazon.awssdk.services.dynamodb.model.QueryRequest;
import software.amazon.awssdk.services.dynamodb.model.QueryResponse;

/**
 * Unit coverage for route-specific, complete pagination keys and explicit merged-inbox branch state.
 */
@Tag("unit")
@ExtendWith(MockitoExtension.class)
class PaginationTokenValidationTest {

    private static final String TIMELINES_TABLE = "JavaTimelines";
    private static final String CONVERSATIONS_TABLE = "JavaConversations";
    private static final String USER_ID = "user_1";

    @Mock
    private DynamoDbAsyncClient client;

    @Test
    void queryTimelineWithIncompleteContinuationKeyRejectsTokenBeforeQuery() {
        String token = PaginationTokenCodec.encode(Map.of("timelinePostId", AttributeValue.fromS("post_1")));
        LowLevelDynamoDbTimelineRepository repository = new LowLevelDynamoDbTimelineRepository(client, TIMELINES_TABLE);

        assertThatThrownBy(() -> repository.queryTimeline(USER_ID, 10, false, token))
                .isInstanceOf(InvalidPaginationTokenException.class);
        verify(client, times(0)).query(any(QueryRequest.class));
    }

    @Test
    void queryInboxWithIncompleteFilteredContinuationKeyRejectsTokenBeforeQuery() {
        String token = PaginationTokenCodec.encode(Map.of("conversationType", AttributeValue.fromS("GROUP")));
        LowLevelDynamoDbConversationRepository repository =
                new LowLevelDynamoDbConversationRepository(client, CONVERSATIONS_TABLE);

        assertThatThrownBy(() -> repository.queryInbox(USER_ID, "GROUP", 10, false, token))
                .isInstanceOf(InvalidPaginationTokenException.class);
        verify(client, times(0)).query(any(QueryRequest.class));
    }

    @Test
    void queryInboxWithExhaustedMergedBranchDoesNotRestartThatBranch() {
        String token = PaginationTokenCodec.encode(Map.of(
                "inboxMerged", AttributeValue.fromS("1"),
                "directState", AttributeValue.fromS("EXHAUSTED"),
                "groupState", AttributeValue.fromS("START")));
        when(client.query(any(QueryRequest.class))).thenReturn(CompletableFuture.completedFuture(
                QueryResponse.builder().items(List.of()).build()));
        LowLevelDynamoDbConversationRepository repository =
                new LowLevelDynamoDbConversationRepository(client, CONVERSATIONS_TABLE);

        InboxPage page = repository.queryInbox(USER_ID, null, 10, false, token).join();

        assertThat(page.items()).isEmpty();
        assertThat(page.nextToken()).isNull();
        verify(client, times(1)).query(any(QueryRequest.class));
    }

    @Test
    void queryInboxWithUnexpectedMergedTokenAttributeRejectsTokenBeforeQuery() {
        String token = PaginationTokenCodec.encode(Map.of(
                "inboxMerged", AttributeValue.fromS("1"),
                "directState", AttributeValue.fromS("START"),
                "groupState", AttributeValue.fromS("START"),
                "timelinePostId", AttributeValue.fromS("post_1")));
        LowLevelDynamoDbConversationRepository repository =
                new LowLevelDynamoDbConversationRepository(client, CONVERSATIONS_TABLE);

        assertThatThrownBy(() -> repository.queryInbox(USER_ID, null, 10, false, token))
                .isInstanceOf(InvalidPaginationTokenException.class);
        verify(client, times(0)).query(any(QueryRequest.class));
    }

    @Test
    void queryInboxWithInvalidMergedTokenMarkerRejectsTokenBeforeQuery() {
        String token = PaginationTokenCodec.encode(Map.of(
                "inboxMerged", AttributeValue.fromS("wrong-route"),
                "directState", AttributeValue.fromS("START"),
                "groupState", AttributeValue.fromS("START")));
        LowLevelDynamoDbConversationRepository repository =
                new LowLevelDynamoDbConversationRepository(client, CONVERSATIONS_TABLE);

        assertThatThrownBy(() -> repository.queryInbox(USER_ID, null, 10, false, token))
                .isInstanceOf(InvalidPaginationTokenException.class);
        verify(client, times(0)).query(any(QueryRequest.class));
    }
}
