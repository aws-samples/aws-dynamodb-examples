package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

import org.slf4j.Logger;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.ConversationMeta;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.ConversationParticipant;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.InboxEntry;
import software.amazon.awssdk.enhanced.dynamodb.TableSchema;
import software.amazon.awssdk.services.dynamodb.DynamoDbAsyncClient;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;
import software.amazon.awssdk.services.dynamodb.model.Put;
import software.amazon.awssdk.services.dynamodb.model.TransactWriteItem;
import software.amazon.awssdk.services.dynamodb.model.TransactWriteItemsRequest;
import software.amazon.awssdk.services.dynamodb.model.UpdateItemRequest;

/**
 * Shared Conversations-table writes used by both repository implementations.
 *
 * <p>Create uses chunked {@code TransactWriteItems}. The first chunk is metadata plus up to 99
 * participants. Later chunks hold up to 100 participants. Inbox fan-out stays on 25-item
 * {@code BatchWriteItem} chunks.
 */
final class ConversationWriteOperations {

    private static final int FIRST_CHUNK_PARTICIPANTS = 99;
    private static final int CHUNK_PARTICIPANTS = 100;
    private static final TableSchema<ConversationMeta> META_SCHEMA = TableSchema.fromBean(ConversationMeta.class);
    private static final TableSchema<ConversationParticipant> PARTICIPANT_SCHEMA =
            TableSchema.fromBean(ConversationParticipant.class);
    private static final TableSchema<InboxEntry> INBOX_SCHEMA = TableSchema.fromBean(InboxEntry.class);

    private ConversationWriteOperations() {
    }

    /** Creates the metadata and participant rows in bounded conditional transaction chunks. */
    static CompletableFuture<Void> createConversation(DynamoDbAsyncClient client, String tableName,
                                                      ConversationMeta meta,
                                                      List<ConversationParticipant> participants) {
        List<List<TransactWriteItem>> chunks = new ArrayList<>();
        List<TransactWriteItem> firstChunk = new ArrayList<>();
        firstChunk.add(TransactWriteItem.builder().put(Put.builder().tableName(tableName)
                .item(META_SCHEMA.itemToMap(meta, true)).conditionExpression("attribute_not_exists(PK)")
                .build()).build());
        int index = 0;
        while (index < participants.size() && firstChunk.size() <= FIRST_CHUNK_PARTICIPANTS) {
            firstChunk.add(participantPut(tableName, participants.get(index++)));
        }
        chunks.add(firstChunk);
        while (index < participants.size()) {
            int end = Math.min(index + CHUNK_PARTICIPANTS, participants.size());
            List<TransactWriteItem> chunk = new ArrayList<>();
            while (index < end) {
                chunk.add(participantPut(tableName, participants.get(index++)));
            }
            chunks.add(chunk);
        }
        return commitChunks(client, chunks, 0);
    }

    /** Writes rows that are absent after an interrupted create attempt. */
    static CompletableFuture<Void> repairParticipants(DynamoDbAsyncClient client, String tableName,
                                                       List<ConversationParticipant> participants) {
        List<List<TransactWriteItem>> chunks = new ArrayList<>();
        for (int index = 0; index < participants.size(); index += CHUNK_PARTICIPANTS) {
            int end = Math.min(index + CHUNK_PARTICIPANTS, participants.size());
            List<TransactWriteItem> chunk = new ArrayList<>();
            for (int participantIndex = index; participantIndex < end; participantIndex++) {
                chunk.add(participantPut(tableName, participants.get(participantIndex)));
            }
            chunks.add(chunk);
        }
        return commitChunks(client, chunks, 0);
    }

    /** Transitions a fully materialized conversation from {@code CREATING} to {@code ACTIVE}. */
    static CompletableFuture<Void> activateConversation(DynamoDbAsyncClient client, String tableName,
                                                        String conversationId) {
        UpdateItemRequest request = UpdateItemRequest.builder().tableName(tableName)
                .key(RepositoryKeys.pkSk(ConversationMeta.partitionKey(conversationId), ConversationMeta.SORT_KEY))
                .updateExpression("SET lifecycleState = :active")
                .conditionExpression("attribute_exists(PK) AND lifecycleState = :creating")
                .expressionAttributeValues(Map.of(
                        ":active", AttributeValue.fromS(ConversationMeta.LIFECYCLE_ACTIVE),
                        ":creating", AttributeValue.fromS(ConversationMeta.LIFECYCLE_CREATING)))
                .build();
        return client.updateItem(request).thenApply(ignored -> null);
    }

    /** Upserts one inbox projection per participant in bounded batch-write chunks. */
    static CompletableFuture<Void> fanOutInbox(DynamoDbAsyncClient client, String tableName,
                                               List<InboxEntry> entries, int chunkSize, Logger logger) {
        List<Map<String, AttributeValue>> itemMaps = new ArrayList<>();
        for (InboxEntry entry : entries) {
            itemMaps.add(INBOX_SCHEMA.itemToMap(entry, true));
        }
        return FanOutWriter.writeChunked(client, tableName, itemMaps, chunkSize, logger);
    }

    /** Commits transaction chunks in order so a retry can repair only the missing suffix. */
    private static CompletableFuture<Void> commitChunks(DynamoDbAsyncClient client,
                                                        List<List<TransactWriteItem>> chunks, int index) {
        if (index >= chunks.size()) {
            return CompletableFuture.completedFuture(null);
        }
        TransactWriteItemsRequest request = TransactWriteItemsRequest.builder()
                .transactItems(chunks.get(index)).build();
        return client.transactWriteItems(request).thenCompose(ignored -> commitChunks(client, chunks, index + 1));
    }

    /** Builds the conditional participant write used by create and repair. */
    private static TransactWriteItem participantPut(String tableName, ConversationParticipant participant) {
        return TransactWriteItem.builder().put(Put.builder().tableName(tableName)
                .item(PARTICIPANT_SCHEMA.itemToMap(participant, true)).conditionExpression("attribute_not_exists(SK)")
                .build()).build();
    }
}
