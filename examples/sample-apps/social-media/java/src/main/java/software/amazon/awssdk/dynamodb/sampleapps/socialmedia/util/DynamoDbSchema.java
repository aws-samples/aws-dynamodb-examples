package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.util;

import java.util.List;

/**
 * Canonical DynamoDB attribute and index metadata shared by table creation and GSI queries.
 *
 * <p>The GSI continuation-key lists include the table primary key, the GSI partition key, and every
 * ordered GSI sort-key component. A token is accepted only when it retains that complete shape.
 */
public final class DynamoDbSchema {

    public static final String PARTITION_KEY = "PK";
    public static final String SORT_KEY = "SK";

    public static final String GSI_TIMELINE = "GSI_TIMELINE";
    public static final String TIMELINE_USER_ID = "timelineUserId";
    public static final String TIMELINE_CREATED_AT = "timelineCreatedAt";
    public static final String TIMELINE_POST_ID = "timelinePostId";
    public static final List<String> TIMELINE_CONTINUATION_KEY = List.of(
            PARTITION_KEY, SORT_KEY, TIMELINE_USER_ID, TIMELINE_CREATED_AT, TIMELINE_POST_ID);

    public static final String GSI_INBOX = "GSI_INBOX";
    public static final String INBOX_USER_ID = "inboxUserId";
    public static final String CONVERSATION_TYPE = "conversationType";
    public static final String LAST_ACTIVITY_AT = "lastActivityAt";
    public static final List<String> INBOX_CONTINUATION_KEY = List.of(
            PARTITION_KEY, SORT_KEY, INBOX_USER_ID, CONVERSATION_TYPE, LAST_ACTIVITY_AT);

    /** Utility class, not instantiable. */
    private DynamoDbSchema() {
    }
}
