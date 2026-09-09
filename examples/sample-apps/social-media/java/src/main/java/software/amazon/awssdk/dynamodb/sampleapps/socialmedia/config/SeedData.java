package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.config;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Single source of truth for deterministic demo seed rows created at local startup.
 *
 * <p>Seeding runs only when {@code dynamodb.create-resources=true}, with a conditional
 * {@code PutItem} ({@code attribute_not_exists(PK)}) per row so re-runs do not overwrite. There are
 * no message, timeline, or notification seed rows.
 *
 * <p>Rows target two tables:
 * <ul>
 *   <li>{@link #userGraphRows()}: three user profiles plus one follow edge pair (Alice follows Bob)</li>
 *   <li>{@link #conversationRows()}: a direct message conversation and a three-member group, each
 *       with metadata, participant, and inbox projection rows</li>
 * </ul>
 *
 * <p>Each map uses DynamoDB attribute names as keys. Values are strings or whole numbers. The table
 * initializer converts these to attribute-value maps for {@code PutItem}.
 */
public final class SeedData {

    /** Not instantiable. Use the static row factories. */
    private SeedData() {
    }

    /**
     * Returns the UserGraph seed rows: three profiles and the Alice-follows-Bob edge pair.
     *
     * @return immutable list of attribute maps for the UserGraph table
     */
    public static List<Map<String, Object>> userGraphRows() {
        return List.of(
                profileRow("user_alice", "Alice"),
                profileRow("user_bob", "Bob"),
                profileRow("user_carol", "Carol"),
                Map.of(
                        "PK", "USER#user_alice",
                        "SK", "FOLLOWING#user_bob",
                        "entityType", "FOLLOWING_EDGE",
                        "followerId", "user_alice",
                        "followeeId", "user_bob",
                        "createdAt", "2026-01-02T00:00:00Z"),
                Map.of(
                        "PK", "USER#user_bob",
                        "SK", "FOLLOWER#user_alice",
                        "entityType", "FOLLOWER_EDGE",
                        "followerId", "user_alice",
                        "followeeId", "user_bob",
                        "createdAt", "2026-01-02T00:00:00Z"));
    }

    /**
     * Returns the Conversations seed rows: a direct message (Alice and Bob) and a group (Alice, Bob,
     * Carol), each with metadata, participant, and inbox projection rows.
     *
     * @return immutable list of attribute maps for the Conversations table
     */
    public static List<Map<String, Object>> conversationRows() {
        return List.of(
                Map.of(
                        "PK", "CONVERSATION#conv_alice_bob",
                        "SK", "META",
                        "entityType", "CONVERSATION_META",
                        "conversationId", "conv_alice_bob",
                        "type", "DIRECT_MESSAGE",
                        "participantCount", 2,
                        "createdAt", "2026-01-03T00:00:00Z"),
                participantRow("conv_alice_bob", "user_alice", "2026-01-03T00:00:00Z"),
                participantRow("conv_alice_bob", "user_bob", "2026-01-03T00:00:00Z"),
                inboxRow("user_alice", "conv_alice_bob", "DIRECT_MESSAGE", "2026-01-03T00:00:00Z", null),
                inboxRow("user_bob", "conv_alice_bob", "DIRECT_MESSAGE", "2026-01-03T00:00:00Z", null),
                Map.of(
                        "PK", "CONVERSATION#conv_study_group",
                        "SK", "META",
                        "entityType", "CONVERSATION_META",
                        "conversationId", "conv_study_group",
                        "type", "GROUP",
                        "title", "Study group",
                        "participantCount", 3,
                        "createdAt", "2026-01-04T00:00:00Z"),
                participantRow("conv_study_group", "user_alice", "2026-01-04T00:00:00Z"),
                participantRow("conv_study_group", "user_bob", "2026-01-04T00:00:00Z"),
                participantRow("conv_study_group", "user_carol", "2026-01-04T00:00:00Z"),
                inboxRow("user_alice", "conv_study_group", "GROUP", "2026-01-04T00:00:00Z", "Study group"),
                inboxRow("user_bob", "conv_study_group", "GROUP", "2026-01-04T00:00:00Z", "Study group"),
                inboxRow("user_carol", "conv_study_group", "GROUP", "2026-01-04T00:00:00Z", "Study group"));
    }

    /**
     * Builds one UserProfile row map.
     *
     * @param userId      the user id
     * @param displayName the human-readable name
     * @return attribute map for the UserGraph table
     */
    private static Map<String, Object> profileRow(String userId, String displayName) {
        return Map.of(
                "PK", "USER#" + userId,
                "SK", "PROFILE",
                "entityType", "USER_PROFILE",
                "userId", userId,
                "displayName", displayName,
                "createdAt", "2026-01-01T00:00:00Z");
    }

    /**
     * Builds one ConversationParticipant row map.
     *
     * @param conversationId the owning conversation id
     * @param userId         the participant id
     * @param joinedAt       ISO-8601 UTC join time
     * @return attribute map for the Conversations table
     */
    private static Map<String, Object> participantRow(String conversationId, String userId, String joinedAt) {
        return Map.of(
                "PK", "CONVERSATION#" + conversationId,
                "SK", "PARTICIPANT#" + userId,
                "entityType", "CONVERSATION_PARTICIPANT",
                "userId", userId,
                "joinedAt", joinedAt);
    }

    /** Builds one deterministic inbox projection row for a seeded participant. */
    private static Map<String, Object> inboxRow(String userId, String conversationId, String conversationType,
                                                String lastActivityAt, String title) {
        Map<String, Object> row = new HashMap<>();
        row.put("PK", "USER#" + userId);
        row.put("SK", "INBOX#" + conversationId);
        row.put("entityType", "INBOX_ENTRY");
        row.put("inboxUserId", userId);
        row.put("conversationType", conversationType);
        row.put("lastActivityAt", lastActivityAt);
        row.put("conversationId", conversationId);
        row.put("lastMessagePreview", "No messages yet");
        if (title != null) {
            row.put("title", title);
        }
        return Map.copyOf(row);
    }
}
