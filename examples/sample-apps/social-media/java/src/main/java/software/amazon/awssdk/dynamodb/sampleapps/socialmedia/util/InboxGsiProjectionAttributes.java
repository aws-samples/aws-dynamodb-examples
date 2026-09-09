package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.util;

import java.util.List;

import software.amazon.awssdk.services.dynamodb.model.ProjectionType;

/**
 * Shared DynamoDB attribute names for the {@code GSI_INBOX} INCLUDE projection on the Conversations
 * table.
 *
 * <p>{@code GSI_INBOX} uses {@link ProjectionType#INCLUDE}. Beyond the index and table keys it
 * projects exactly the non-key attributes listed in {@link #GSI_INBOX_PROJECTED_NON_KEYS}. That list
 * is the contract for a complete inbox list response without a base-table follow-up read.
 * Runtime table creation and the  query projection must use the same list so the response
 * shape stays consistent.
 */
public final class InboxGsiProjectionAttributes {

public static final List<String> GSI_INBOX_PROJECTED_NON_KEYS = List.of(
            "conversationId",
            "lastMessagePreview",
            "title");

    /** Prevents instantiation. This type only carries shared projection metadata. */
    private InboxGsiProjectionAttributes() {
    }
}
