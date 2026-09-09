package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.ConversationMeta;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.ConversationParticipant;
import software.amazon.awssdk.enhanced.dynamodb.TableSchema;
import software.amazon.awssdk.services.dynamodb.DynamoDbAsyncClient;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;
import software.amazon.awssdk.services.dynamodb.model.Get;
import software.amazon.awssdk.services.dynamodb.model.GetItemRequest;
import software.amazon.awssdk.services.dynamodb.model.ItemResponse;
import software.amazon.awssdk.services.dynamodb.model.QueryRequest;
import software.amazon.awssdk.services.dynamodb.model.TransactGetItem;
import software.amazon.awssdk.services.dynamodb.model.TransactGetItemsRequest;

/**
 * Shared strongly consistent Conversations-table reads used by both repository implementations.
 *
 * <p>{@link #queryParticipants(DynamoDbAsyncClient, String, String)} loads only
 * {@code PARTICIPANT#} rows with a paginated consistent {@code Query}. It does not read metadata
 * and does not use {@code TransactGetItems}.
 *
 * <p>{@link #getSnapshot(DynamoDbAsyncClient, String, String)} loads metadata plus every participant
 * in one {@code TransactGetItems} when that set is at most 100 items. A larger group falls back to a
 * metadata-only transaction plus the participant {@code Query} already used to discover keys.
 */
final class ConversationReadOperations {

    private static final int SNAPSHOT_TRANSACTION_MAX_ITEMS = 100;
    private static final int PARTICIPANT_QUERY_PAGE_SIZE = 100;
    private static final TableSchema<ConversationMeta> META_SCHEMA = TableSchema.fromBean(ConversationMeta.class);
    private static final TableSchema<ConversationParticipant> PARTICIPANT_SCHEMA =
            TableSchema.fromBean(ConversationParticipant.class);

    private ConversationReadOperations() {
    }

    static CompletableFuture<ConversationMeta> getConversationMeta(DynamoDbAsyncClient client, String tableName,
                                                                   String conversationId) {
        GetItemRequest request = GetItemRequest.builder().tableName(tableName)
                .key(RepositoryKeys.pkSk(ConversationMeta.partitionKey(conversationId), ConversationMeta.SORT_KEY))
                .consistentRead(true).build();
        return client.getItem(request)
                .thenApply(response -> response.hasItem() ? META_SCHEMA.mapToItem(response.item()) : null);
    }

    static CompletableFuture<ConversationParticipant> getParticipant(DynamoDbAsyncClient client, String tableName,
                                                                     String conversationId, String userId) {
        GetItemRequest request = GetItemRequest.builder().tableName(tableName)
                .key(RepositoryKeys.pkSk(ConversationParticipant.PK_PREFIX + conversationId,
                        ConversationParticipant.sortKey(userId)))
                .consistentRead(true).build();
        return client.getItem(request)
                .thenApply(response -> response.hasItem() ? PARTICIPANT_SCHEMA.mapToItem(response.item()) : null);
    }

    /**
     * Loads a coherent snapshot. Metadata plus participants fit one {@code TransactGetItems} when
     * the item count is at most 100. Larger groups use a metadata transaction plus the participant
     * query result.
     *
     * @param client         low-level async client
     * @param tableName      Conversations table name
     * @param conversationId conversation whose snapshot is read
     * @return future completing with metadata and members, or null metadata when absent
     */
    static CompletableFuture<ConversationSnapshot> getSnapshot(DynamoDbAsyncClient client, String tableName,
                                                                String conversationId) {
        return queryParticipants(client, tableName, conversationId).thenCompose(participants -> {
            if (1 + participants.size() <= SNAPSHOT_TRANSACTION_MAX_ITEMS) {
                return transactGetSnapshot(client, tableName, conversationId, participants);
            }
            return transactGetMeta(client, tableName, conversationId).thenApply(meta -> meta == null
                    ? new ConversationSnapshot(null, List.of()) : new ConversationSnapshot(meta, participants));
        });
    }

    /** Loads the metadata and discovered participant keys as one transaction. */
    private static CompletableFuture<ConversationSnapshot> transactGetSnapshot(DynamoDbAsyncClient client,
            String tableName, String conversationId, List<ConversationParticipant> discovered) {
        List<TransactGetItem> gets = new ArrayList<>();
        gets.add(getItem(tableName, ConversationMeta.partitionKey(conversationId), ConversationMeta.SORT_KEY));
        for (ConversationParticipant participant : discovered) {
            gets.add(getItem(tableName, ConversationParticipant.PK_PREFIX + conversationId,
                    ConversationParticipant.sortKey(participant.getUserId())));
        }
        TransactGetItemsRequest request = TransactGetItemsRequest.builder().transactItems(gets).build();
        return client.transactGetItems(request).thenApply(response -> {
            List<ItemResponse> responses = response.responses();
            Map<String, AttributeValue> metaItem = responses.get(0).item();
            if (metaItem == null || metaItem.isEmpty()) {
                return new ConversationSnapshot(null, List.of());
            }
            List<ConversationParticipant> participants = new ArrayList<>();
            for (int index = 1; index < responses.size(); index++) {
                Map<String, AttributeValue> item = responses.get(index).item();
                if (item != null && !item.isEmpty()) {
                    participants.add(PARTICIPANT_SCHEMA.mapToItem(item));
                }
            }
            return new ConversationSnapshot(META_SCHEMA.mapToItem(metaItem), participants);
        });
    }

    /** Reads metadata transactionally for the large-group fallback. */
    private static CompletableFuture<ConversationMeta> transactGetMeta(DynamoDbAsyncClient client, String tableName,
                                                                       String conversationId) {
        TransactGetItemsRequest request = TransactGetItemsRequest.builder()
                .transactItems(getItem(tableName, ConversationMeta.partitionKey(conversationId),
                        ConversationMeta.SORT_KEY))
                .build();
        return client.transactGetItems(request).thenApply(response -> {
            Map<String, AttributeValue> metaItem = response.responses().get(0).item();
            return metaItem == null || metaItem.isEmpty() ? null : META_SCHEMA.mapToItem(metaItem);
        });
    }

    private static TransactGetItem getItem(String tableName, String pk, String sk) {
        return TransactGetItem.builder().get(Get.builder().tableName(tableName)
                .key(RepositoryKeys.pkSk(pk, sk)).build()).build();
    }

    /**
     * Queries every {@code PARTICIPANT#} row under the conversation partition.
     *
     * <p>The read is strongly consistent. Each page requests up to 100 items. Remaining pages are
     * drained through {@code ExclusiveStartKey} so a group up to
     * {@code dynamodb.conversation-participant-max} is returned in full. Metadata is not fetched.
     * {@code TransactGetItems} is not used.
     *
     * @param client         low-level async client
     * @param tableName      Conversations table name
     * @param conversationId conversation whose members are listed
     * @return participant rows in sort-key order, empty when none exist
     */
    static CompletableFuture<List<ConversationParticipant>> queryParticipants(DynamoDbAsyncClient client,
            String tableName, String conversationId) {
        QueryRequest request = QueryRequest.builder().tableName(tableName).consistentRead(true)
                .limit(PARTICIPANT_QUERY_PAGE_SIZE)
                .keyConditionExpression("PK = :pk AND begins_with(SK, :skPrefix)")
                .expressionAttributeValues(Map.of(
                        ":pk", AttributeValue.fromS(ConversationParticipant.PK_PREFIX + conversationId),
                        ":skPrefix", AttributeValue.fromS(ConversationParticipant.SK_PREFIX)))
                .build();
        return drainParticipants(client, request, new ArrayList<>());
    }

    /** Drains a participant query without weakening its consistent-read contract. */
    private static CompletableFuture<List<ConversationParticipant>> drainParticipants(DynamoDbAsyncClient client,
            QueryRequest request, List<ConversationParticipant> participants) {
        return client.query(request).thenCompose(response -> {
            response.items().forEach(item -> participants.add(PARTICIPANT_SCHEMA.mapToItem(item)));
            Map<String, AttributeValue> lastKey = response.lastEvaluatedKey();
            if (lastKey == null || lastKey.isEmpty()) {
                return CompletableFuture.completedFuture(participants);
            }
            return drainParticipants(client, request.toBuilder().exclusiveStartKey(lastKey).build(), participants);
        });
    }
}
