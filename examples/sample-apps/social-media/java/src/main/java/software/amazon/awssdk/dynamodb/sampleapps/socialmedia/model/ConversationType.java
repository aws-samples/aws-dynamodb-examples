package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model;

/**
 * Conversation type.
 *
 * <p>A {@link #DIRECT_MESSAGE} has exactly two distinct participants. A {@link #GROUP} has between
 * {@code dynamodb.conversation-participant-min} and {@code dynamodb.conversation-participant-max}
 * distinct participants. Persisted as the enum {@link #name()} string and used as the first segment
 * of the {@code GSI_INBOX} sort key.
 */
public enum ConversationType {

    /** A one-to-one conversation between exactly two users. */
    DIRECT_MESSAGE,

    /** A conversation with three or more users and fixed membership at create. */
    GROUP
}
