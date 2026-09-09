package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Repository;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.config.FollowerFanoutCap;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.FollowerEdge;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.FollowingEdge;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.UserProfile;
import software.amazon.awssdk.enhanced.dynamodb.TableSchema;
import software.amazon.awssdk.services.dynamodb.DynamoDbAsyncClient;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;
import software.amazon.awssdk.services.dynamodb.model.GetItemRequest;
import software.amazon.awssdk.services.dynamodb.model.Put;
import software.amazon.awssdk.services.dynamodb.model.PutItemRequest;
import software.amazon.awssdk.services.dynamodb.model.QueryRequest;
import software.amazon.awssdk.services.dynamodb.model.TransactWriteItem;
import software.amazon.awssdk.services.dynamodb.model.TransactWriteItemsRequest;

/**
 * Low-level {@link UserGraphRepository} using {@link DynamoDbAsyncClient} with attribute maps.
 * Selected when {@code dynamodb.client-type=low-level}. Beans are mapped through
 * {@link TableSchema#itemToMap}/{@link TableSchema#mapToItem} so both client types persist an
 * identical item shape.
 */
@Repository
@ConditionalOnProperty(name = "dynamodb.client-type", havingValue = "low-level")
public class LowLevelDynamoDbUserGraphRepository implements UserGraphRepository {

    private static final Logger logger = LoggerFactory.getLogger(LowLevelDynamoDbUserGraphRepository.class);

    private static final TableSchema<UserProfile> PROFILE_SCHEMA = TableSchema.fromBean(UserProfile.class);
    private static final TableSchema<FollowingEdge> FOLLOWING_SCHEMA = TableSchema.fromBean(FollowingEdge.class);
    private static final TableSchema<FollowerEdge> FOLLOWER_SCHEMA = TableSchema.fromBean(FollowerEdge.class);

    private final DynamoDbAsyncClient client;
    private final String tableName;
    private final int followerFanoutCap;

    /**
     * @param client            low-level async client
     * @param tableName         configured UserGraph table name
     * @param followerFanoutCap maximum follower edges to return for {@code PUBLIC} fan-out
     */
    public LowLevelDynamoDbUserGraphRepository(
            DynamoDbAsyncClient client,
            @Value("${dynamodb.table-name.user-graph}") String tableName,
            FollowerFanoutCap followerFanoutCap) {
        this.client = client;
        this.tableName = tableName;
        this.followerFanoutCap = followerFanoutCap.value();
        logger.info("Initialized low-level UserGraph repository [tableName={}]", tableName);
    }

    /** {@inheritDoc} */
    @Override
    public CompletableFuture<Void> putProfileIfAbsent(UserProfile profile) {
        PutItemRequest request = PutItemRequest.builder()
                .tableName(tableName)
                .item(PROFILE_SCHEMA.itemToMap(profile, true))
                .conditionExpression("attribute_not_exists(PK)")
                .build();
        return client.putItem(request).thenApply(r -> null);
    }

    /** {@inheritDoc} */
    @Override
    public CompletableFuture<UserProfile> getProfile(String userId) {
        GetItemRequest request = GetItemRequest.builder()
                .tableName(tableName)
                .key(RepositoryKeys.pkSk(UserProfile.partitionKey(userId), UserProfile.SORT_KEY))
                .consistentRead(true)
                .build();
        return client.getItem(request)
                .thenApply(response -> response.hasItem() ? PROFILE_SCHEMA.mapToItem(response.item()) : null);
    }

    /** {@inheritDoc} */
    @Override
    public CompletableFuture<Void> followTransaction(FollowingEdge following, FollowerEdge follower) {
        TransactWriteItem followingItem = TransactWriteItem.builder()
                .put(Put.builder()
                        .tableName(tableName)
                        .item(FOLLOWING_SCHEMA.itemToMap(following, true))
                        .conditionExpression("attribute_not_exists(SK)")
                        .build())
                .build();
        TransactWriteItem followerItem = TransactWriteItem.builder()
                .put(Put.builder()
                        .tableName(tableName)
                        .item(FOLLOWER_SCHEMA.itemToMap(follower, true))
                        .conditionExpression("attribute_not_exists(SK)")
                        .build())
                .build();
        return client.transactWriteItems(TransactWriteItemsRequest.builder()
                .transactItems(followingItem, followerItem)
                .build()).thenApply(r -> null);
    }

    /** {@inheritDoc} */
    @Override
    public CompletableFuture<FollowingEdge> getFollowingEdge(String followerId, String followeeId) {
        GetItemRequest request = GetItemRequest.builder()
                .tableName(tableName)
                .key(RepositoryKeys.pkSk(FollowingEdge.PK_PREFIX + followerId, FollowingEdge.sortKey(followeeId)))
                .consistentRead(true)
                .build();
        return client.getItem(request)
                .thenApply(response -> response.hasItem() ? FOLLOWING_SCHEMA.mapToItem(response.item()) : null);
    }

    /** {@inheritDoc} */
    @Override
    public CompletableFuture<FollowerQueryResult> queryFollowers(String followeeId) {
        QueryRequest request = QueryRequest.builder()
                .tableName(tableName)
                .keyConditionExpression("PK = :pk AND begins_with(SK, :skPrefix)")
                .expressionAttributeValues(Map.of(
                        ":pk", AttributeValue.fromS(FollowerEdge.PK_PREFIX + followeeId),
                        ":skPrefix", AttributeValue.fromS(FollowerEdge.SK_PREFIX)))
                .limit(followerFanoutCap + 1)
                .build();
        return queryFollowers(request, new ArrayList<>())
                .thenApply(this::toResult);
    }

    /**
     * Reads follower pages until the partition ends or {@code cap} plus one items have been seen.
     *
     * @param request current query, including any exclusive start key
     * @param acc     items collected so far
     * @return accumulated edges, possibly one past the cap
     */
    private CompletableFuture<List<FollowerEdge>> queryFollowers(QueryRequest request, List<FollowerEdge> acc) {
        int remainingToDetectOverflow = followerFanoutCap + 1 - acc.size();
        QueryRequest pageRequest = request.toBuilder().limit(remainingToDetectOverflow).build();
        return client.query(pageRequest).thenCompose(response -> {
            response.items().forEach(item -> acc.add(FOLLOWER_SCHEMA.mapToItem(item)));
            if (acc.size() > followerFanoutCap) {
                return CompletableFuture.completedFuture(acc);
            }
            Map<String, AttributeValue> last = response.lastEvaluatedKey();
            if (last == null || last.isEmpty() || response.items().isEmpty()) {
                return CompletableFuture.completedFuture(acc);
            }
            return queryFollowers(request.toBuilder().exclusiveStartKey(last).build(), acc);
        });
    }

    /**
     * Trims an overflow item and records whether the partition was fully read within the cap.
     *
     * @param acc collected edges, possibly one past the cap
     * @return bounded result
     */
    private FollowerQueryResult toResult(List<FollowerEdge> acc) {
        boolean complete = acc.size() <= followerFanoutCap;
        List<FollowerEdge> followers = complete ? acc : acc.subList(0, followerFanoutCap);
        return new FollowerQueryResult(followers, complete, followerFanoutCap);
    }
}
