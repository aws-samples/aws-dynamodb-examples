package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.CompletableFuture;

import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.exception.InvalidPaginationTokenException;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.InboxEntry;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.util.DynamoDbSchema;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.util.PaginationTokenCodec;
import software.amazon.awssdk.enhanced.dynamodb.TableSchema;
import software.amazon.awssdk.services.dynamodb.DynamoDbAsyncClient;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;
import software.amazon.awssdk.services.dynamodb.model.QueryRequest;

/** Shared {@code GSI_INBOX} queries and route-specific continuation-token handling. */
final class InboxQueryOperations {

    private static final String TOKEN_DISCRIMINATOR = DynamoDbSchema.CONVERSATION_TYPE;
    private static final String MERGED_TOKEN_DISCRIMINATOR = "inboxMerged";
    private static final String MERGED_TOKEN_VALUE = "1";
    private static final String DIRECT_CURSOR_PREFIX = "d#";
    private static final String GROUP_CURSOR_PREFIX = "g#";
    private static final String DIRECT_STATE_ATTRIBUTE = "directState";
    private static final String GROUP_STATE_ATTRIBUTE = "groupState";
    private static final String DIRECT_MESSAGE_TYPE = "DIRECT_MESSAGE";
    private static final String GROUP_TYPE = "GROUP";
    private static final TableSchema<InboxEntry> INBOX_SCHEMA = TableSchema.fromBean(InboxEntry.class);

    private InboxQueryOperations() {
    }

    /** Reads a filtered inbox page or merges the direct-message and group branches. */
    static CompletableFuture<InboxPage> queryInbox(DynamoDbAsyncClient client, String tableName, String userId,
                                                   String type, int limit, boolean scanIndexForward, String nextToken) {
        return type == null ? queryMerged(client, tableName, userId, limit, scanIndexForward, nextToken)
                : querySingleType(client, tableName, userId, type, limit, scanIndexForward, nextToken);
    }

    /** Reads a single conversation-type partition and validates its continuation token. */
    private static CompletableFuture<InboxPage> querySingleType(DynamoDbAsyncClient client, String tableName,
            String userId, String type, int limit, boolean scanIndexForward, String nextToken) {
        QueryRequest.Builder builder = baseQuery(tableName, userId, type, limit, scanIndexForward);
        Map<String, AttributeValue> startKey = PaginationTokenCodec.decode(nextToken);
        if (startKey != null) {
            PaginationTokenCodec.requireKeyAttribute(startKey, TOKEN_DISCRIMINATOR, nextToken);
            PaginationTokenCodec.requireCompleteKey(startKey, DynamoDbSchema.INBOX_CONTINUATION_KEY, nextToken);
            builder.exclusiveStartKey(startKey);
        }
        return GsiPageReader.queryPage(client, builder.build()).thenApply(page -> new InboxPage(
                mapItems(page.items()), PaginationTokenCodec.encode(page.lastEvaluatedKey())));
    }

    /** Merges two independently resumable conversation-type query branches. */
    private static CompletableFuture<InboxPage> queryMerged(DynamoDbAsyncClient client, String tableName,
            String userId, int limit, boolean scanIndexForward, String nextToken) {
        MergedCursor cursor = decodeMergedCursor(nextToken);
        CompletableFuture<TypeResult> direct = queryBranch(client, tableName, userId, DIRECT_MESSAGE_TYPE, limit,
                scanIndexForward, cursor.direct());
        CompletableFuture<TypeResult> group = queryBranch(client, tableName, userId, GROUP_TYPE, limit,
                scanIndexForward, cursor.group());
        return direct.thenCombine(group, (directResult, groupResult) -> merge(directResult, groupResult, cursor,
                limit, scanIndexForward));
    }

    /** Builds the merged page and advances only the branch rows emitted by that page. */
    private static InboxPage merge(TypeResult direct, TypeResult group, MergedCursor cursor, int limit,
                                   boolean scanIndexForward) {
        List<InboxEntry> merged = new ArrayList<>(direct.items());
        merged.addAll(group.items());
        Comparator<InboxEntry> byActivity = Comparator.comparing(InboxEntry::getLastActivityAt,
                Comparator.nullsLast(Comparator.naturalOrder()));
        merged.sort(scanIndexForward ? byActivity : byActivity.reversed());
        int pageSize = Math.min(limit, merged.size());
        List<InboxEntry> page = new ArrayList<>(merged.subList(0, pageSize));
        int directConsumed = (int) page.stream()
                .filter(entry -> DIRECT_MESSAGE_TYPE.equals(entry.getConversationType())).count();
        CursorBranch nextDirect = continuationCursor(direct, directConsumed, cursor.direct());
        CursorBranch nextGroup = continuationCursor(group, pageSize - directConsumed, cursor.group());
        return new InboxPage(page, encodeMergedToken(nextDirect, nextGroup));
    }

    /** Queries a branch unless it was permanently exhausted by an earlier page. */
    private static CompletableFuture<TypeResult> queryBranch(DynamoDbAsyncClient client, String tableName,
            String userId, String type, int limit, boolean scanIndexForward, CursorBranch branch) {
        if (branch.state() == BranchState.EXHAUSTED) {
            return CompletableFuture.completedFuture(new TypeResult(List.of(), null));
        }
        QueryRequest.Builder builder = baseQuery(tableName, userId, type, limit, scanIndexForward);
        if (branch.key() != null && !branch.key().isEmpty()) {
            builder.exclusiveStartKey(branch.key());
        }
        return GsiPageReader.queryPage(client, builder.build())
                .thenApply(page -> new TypeResult(mapItems(page.items()), page.lastEvaluatedKey()));
    }

    /** Constructs the common query shape for one inbox conversation type. */
    private static QueryRequest.Builder baseQuery(String tableName, String userId, String type, int limit,
                                                  boolean scanIndexForward) {
        return QueryRequest.builder().tableName(tableName).indexName(DynamoDbSchema.GSI_INBOX)
                .keyConditionExpression(DynamoDbSchema.INBOX_USER_ID + " = :u AND "
                        + DynamoDbSchema.CONVERSATION_TYPE + " = :t")
                .expressionAttributeValues(Map.of(":u", AttributeValue.fromS(userId),
                        ":t", AttributeValue.fromS(type)))
                .scanIndexForward(scanIndexForward).limit(limit);
    }

    /** Maps a DynamoDB page to immutable inbox domain rows. */
    private static List<InboxEntry> mapItems(List<Map<String, AttributeValue>> items) {
        List<InboxEntry> entries = new ArrayList<>();
        items.forEach(item -> entries.add(INBOX_SCHEMA.mapToItem(item)));
        return entries;
    }

    /** Advances one branch cursor while preserving fetched rows that were not emitted. */
    private static CursorBranch continuationCursor(TypeResult result, int consumed, CursorBranch incoming) {
        boolean hasFetchedRemainder = consumed < result.items().size();
        boolean hasMoreBeyondPage = result.lastEvaluatedKey() != null && !result.lastEvaluatedKey().isEmpty();
        if (!hasFetchedRemainder && !hasMoreBeyondPage) {
            return CursorBranch.exhausted();
        }
        if (consumed == 0) {
            return incoming;
        }
        return CursorBranch.afterKey(gsiKey(result.items().get(consumed - 1)));
    }

    /** Builds an index continuation key from an emitted inbox row. */
    private static Map<String, AttributeValue> gsiKey(InboxEntry entry) {
        return Map.of(DynamoDbSchema.PARTITION_KEY, AttributeValue.fromS(entry.getPk()),
                DynamoDbSchema.SORT_KEY, AttributeValue.fromS(entry.getSk()),
                DynamoDbSchema.INBOX_USER_ID, AttributeValue.fromS(entry.getInboxUserId()),
                DynamoDbSchema.CONVERSATION_TYPE, AttributeValue.fromS(entry.getConversationType()),
                DynamoDbSchema.LAST_ACTIVITY_AT, AttributeValue.fromS(entry.getLastActivityAt()));
    }

    /** Encodes both branch states, returning no token only when both branches are exhausted. */
    private static String encodeMergedToken(CursorBranch direct, CursorBranch group) {
        if (direct.state() == BranchState.EXHAUSTED && group.state() == BranchState.EXHAUSTED) {
            return null;
        }
        Map<String, AttributeValue> token = new LinkedHashMap<>();
        token.put(MERGED_TOKEN_DISCRIMINATOR, AttributeValue.fromS(MERGED_TOKEN_VALUE));
        token.put(DIRECT_STATE_ATTRIBUTE, AttributeValue.fromS(direct.state().name()));
        token.put(GROUP_STATE_ATTRIBUTE, AttributeValue.fromS(group.state().name()));
        addBranchKey(token, DIRECT_CURSOR_PREFIX, direct);
        addBranchKey(token, GROUP_CURSOR_PREFIX, group);
        return PaginationTokenCodec.encode(token);
    }

    /** Adds a cursor only for a branch positioned after an emitted row. */
    private static void addBranchKey(Map<String, AttributeValue> token, String prefix, CursorBranch branch) {
        if (branch.state() == BranchState.AFTER_KEY) {
            branch.key().forEach((name, value) -> token.put(prefix + name, value));
        }
    }

    /** Decodes the merged continuation token and validates its route and branch states. */
    private static MergedCursor decodeMergedCursor(String nextToken) {
        Map<String, AttributeValue> token = PaginationTokenCodec.decode(nextToken);
        if (token == null) {
            return new MergedCursor(CursorBranch.start(), CursorBranch.start());
        }
        PaginationTokenCodec.requireKeyAttribute(token, MERGED_TOKEN_DISCRIMINATOR, nextToken);
        if (!MERGED_TOKEN_VALUE.equals(token.get(MERGED_TOKEN_DISCRIMINATOR).s())) {
            throw new InvalidPaginationTokenException(nextToken);
        }
        requireOnlyMergedTokenAttributes(token, nextToken);
        return new MergedCursor(decodeBranch(token, DIRECT_STATE_ATTRIBUTE, DIRECT_CURSOR_PREFIX, nextToken),
                decodeBranch(token, GROUP_STATE_ATTRIBUTE, GROUP_CURSOR_PREFIX, nextToken));
    }

    /** Decodes one branch and rejects incomplete or unexpected cursor attributes. */
    private static CursorBranch decodeBranch(Map<String, AttributeValue> token, String stateAttribute,
            String prefix, String nextToken) {
        AttributeValue encodedState = token.get(stateAttribute);
        if (encodedState == null || encodedState.s() == null) {
            throw new InvalidPaginationTokenException(nextToken);
        }
        BranchState state;
        try {
            state = BranchState.valueOf(encodedState.s());
        } catch (IllegalArgumentException exception) {
            throw new InvalidPaginationTokenException(nextToken, exception);
        }
        Map<String, AttributeValue> key = subKey(token, prefix);
        if (state == BranchState.AFTER_KEY) {
            PaginationTokenCodec.requireCompleteKey(key, DynamoDbSchema.INBOX_CONTINUATION_KEY, nextToken);
            if (!key.keySet().equals(Set.copyOf(DynamoDbSchema.INBOX_CONTINUATION_KEY))) {
                throw new InvalidPaginationTokenException(nextToken);
            }
            return CursorBranch.afterKey(key);
        }
        if (key != null) {
            throw new InvalidPaginationTokenException(nextToken);
        }
        return state == BranchState.START ? CursorBranch.start() : CursorBranch.exhausted();
    }

    /** Rejects attributes that do not belong to the merged-inbox token contract. */
    private static void requireOnlyMergedTokenAttributes(Map<String, AttributeValue> token, String nextToken) {
        for (String key : token.keySet()) {
            boolean known = MERGED_TOKEN_DISCRIMINATOR.equals(key) || DIRECT_STATE_ATTRIBUTE.equals(key)
                    || GROUP_STATE_ATTRIBUTE.equals(key) || key.startsWith(DIRECT_CURSOR_PREFIX)
                    || key.startsWith(GROUP_CURSOR_PREFIX);
            if (!known) {
                throw new InvalidPaginationTokenException(nextToken);
            }
        }
    }

    /** Extracts one prefixed cursor map from the merged token. */
    private static Map<String, AttributeValue> subKey(Map<String, AttributeValue> token, String prefix) {
        Map<String, AttributeValue> key = new LinkedHashMap<>();
        token.forEach((name, value) -> {
            if (name.startsWith(prefix)) {
                key.put(name.substring(prefix.length()), value);
            }
        });
        return key.isEmpty() ? null : key;
    }

    /** States held by one merged-query branch. */
    private enum BranchState { START, AFTER_KEY, EXHAUSTED }

    /** Immutable branch continuation state. */
    private record CursorBranch(BranchState state, Map<String, AttributeValue> key) {
        /** Returns a branch that has not issued a query. */
        private static CursorBranch start() { return new CursorBranch(BranchState.START, null); }
        /** Returns a branch positioned after an emitted index key. */
        private static CursorBranch afterKey(Map<String, AttributeValue> key) {
            return new CursorBranch(BranchState.AFTER_KEY, Map.copyOf(key));
        }
        /** Returns a permanently exhausted branch. */
        private static CursorBranch exhausted() { return new CursorBranch(BranchState.EXHAUSTED, null); }
    }

    /** Pairs direct-message and group branch state. */
    private record MergedCursor(CursorBranch direct, CursorBranch group) { }
    /** Holds one branch query result and its continuation key. */
    private record TypeResult(List<InboxEntry> items, Map<String, AttributeValue> lastEvaluatedKey) { }
}
