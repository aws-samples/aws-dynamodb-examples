package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.exception;

/**
 * Raised when a conversation create request has an invalid participant count: a
 * {@code DIRECT_MESSAGE} without exactly two distinct participants, a {@code GROUP} outside
 * {@code dynamodb.conversation-participant-min}..{@code max}, or duplicate participant ids.
 *
 * <p>Maps to HTTP {@code 400} with error code {@code INVALID_PARTICIPANT_COUNT}.
 */
public class InvalidParticipantCountException extends RuntimeException {

    /**
     * Creates the exception with a client-safe detail message.
     *
     * @param message human-readable reason the participant set was rejected
     */
    public InvalidParticipantCountException(String message) {
        super(message);
    }
}
