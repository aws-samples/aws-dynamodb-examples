package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.unit.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.config.FollowerFanoutCap;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.FollowerEdge;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.FollowerQueryResult;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.LowLevelDynamoDbUserGraphRepository;
import software.amazon.awssdk.enhanced.dynamodb.TableSchema;
import software.amazon.awssdk.services.dynamodb.DynamoDbAsyncClient;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;
import software.amazon.awssdk.services.dynamodb.model.QueryRequest;
import software.amazon.awssdk.services.dynamodb.model.QueryResponse;

/**
 * Unit coverage for bounded follower enumeration on the low-level UserGraph repository.
 *
 * <p>The DynamoDB client is mocked so page-crossing stop conditions can be asserted without Docker.
 * Cap 2 is used so below-cap, at-cap, cap-plus-one, and a three-page walk that stops after the
 * overflow item are cheap.
 */
@Tag("unit")
@ExtendWith(MockitoExtension.class)
class LowLevelDynamoDbUserGraphRepositoryFollowerQueryTest {

    private static final String TABLE = "JavaUserGraph";
    private static final String FOLLOWEE = "user_author";
    private static final TableSchema<FollowerEdge> SCHEMA = TableSchema.fromBean(FollowerEdge.class);

    @Mock
    private DynamoDbAsyncClient client;

    private LowLevelDynamoDbUserGraphRepository repository;

    /**
     * Wires the repository with cap 2.
     */
    @BeforeEach
    void setUp() {
        repository = new LowLevelDynamoDbUserGraphRepository(client, TABLE, new FollowerFanoutCap(2));
    }

    @Test
    void queryFollowers_whenOneFollower_returnsCompleteResult() {
        when(client.query(any(QueryRequest.class)))
                .thenReturn(CompletableFuture.completedFuture(page(List.of(edge("user_a")), Map.of())));

        FollowerQueryResult result = repository.queryFollowers(FOLLOWEE).join();

        assertThat(result.complete()).isTrue();
        assertThat(result.cap()).isEqualTo(2);
        assertThat(ids(result)).containsExactly("user_a");
        verify(client, times(1)).query(any(QueryRequest.class));
    }

    @Test
    void queryFollowers_whenExactlyCap_returnsCompleteResult() {
        when(client.query(any(QueryRequest.class)))
                .thenReturn(CompletableFuture.completedFuture(
                        page(List.of(edge("user_a"), edge("user_b")), Map.of())));

        FollowerQueryResult result = repository.queryFollowers(FOLLOWEE).join();

        assertThat(result.complete()).isTrue();
        assertThat(ids(result)).containsExactly("user_a", "user_b");
        verify(client, times(1)).query(any(QueryRequest.class));
    }

    @Test
    void queryFollowers_whenCapPlusOneOnOnePage_stopsWithoutAnotherQuery() {
        when(client.query(any(QueryRequest.class)))
                .thenReturn(CompletableFuture.completedFuture(
                        page(List.of(edge("user_a"), edge("user_b"), edge("user_c")), Map.of())));

        FollowerQueryResult result = repository.queryFollowers(FOLLOWEE).join();

        assertThat(result.complete()).isFalse();
        assertThat(ids(result)).containsExactly("user_a", "user_b");
        verify(client, times(1)).query(any(QueryRequest.class));
    }

    @Test
    void queryFollowers_whenPagesCrossTheCap_stopsAfterOverflowItem() {
        Map<String, AttributeValue> firstKey = Map.of("SK", AttributeValue.fromS("FOLLOWER#user_a"));
        Map<String, AttributeValue> secondKey = Map.of("SK", AttributeValue.fromS("FOLLOWER#user_b"));
        when(client.query(any(QueryRequest.class)))
                .thenReturn(CompletableFuture.completedFuture(page(List.of(edge("user_a")), firstKey)))
                .thenReturn(CompletableFuture.completedFuture(page(List.of(edge("user_b")), secondKey)))
                .thenReturn(CompletableFuture.completedFuture(page(List.of(edge("user_c")), Map.of())));

        FollowerQueryResult result = repository.queryFollowers(FOLLOWEE).join();

        assertThat(result.complete()).isFalse();
        assertThat(ids(result)).containsExactly("user_a", "user_b");
        verify(client, times(3)).query(any(QueryRequest.class));
    }

    /**
     * Builds a mapped follower edge for the mocked query response.
     *
     * @param followerId follower user id
     * @return edge under {@code FOLLOWEE}'s partition
     */
    private static FollowerEdge edge(String followerId) {
        FollowerEdge edge = new FollowerEdge();
        edge.setPk(FollowerEdge.PK_PREFIX + FOLLOWEE);
        edge.setSk(FollowerEdge.sortKey(followerId));
        edge.setEntityType(FollowerEdge.ENTITY_TYPE);
        edge.setFollowerId(followerId);
        edge.setFolloweeId(FOLLOWEE);
        edge.setCreatedAt("2026-05-27T10:00:00Z");
        return edge;
    }

    /**
     * Builds a query page from follower edges and an optional continuation key.
     *
     * @param edges follower edges on the page
     * @param last  exclusive start key for the next page, empty when done
     * @return query response
     */
    private static QueryResponse page(List<FollowerEdge> edges, Map<String, AttributeValue> last) {
        return QueryResponse.builder()
                .items(edges.stream().map(edge -> SCHEMA.itemToMap(edge, true)).toList())
                .lastEvaluatedKey(last)
                .build();
    }

    /**
     * Extracts follower ids in result order.
     *
     * @param result bounded query result
     * @return follower ids
     */
    private static List<String> ids(FollowerQueryResult result) {
        return result.followers().stream().map(FollowerEdge::getFollowerId).toList();
    }
}
