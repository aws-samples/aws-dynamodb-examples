package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository;

import java.util.List;

import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.ConversationMeta;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.ConversationParticipant;

/**
 * A coherent conversation snapshot: metadata plus the full member list, returned by
 * {@link ConversationRepository#getSnapshot(String)}.
 *
 * <p>Assembled from a {@code TransactGetItems} fast path (direct message or small group) or a
 * {@code META} read plus a participant {@code Query} fallback for large groups. The
 * {@code meta} is {@code null} when the conversation does not exist.
 *
 * @param meta         conversation metadata, or {@code null} when the conversation is absent
 * @param participants member rows, empty when the conversation is absent
 */
public record ConversationSnapshot(ConversationMeta meta, List<ConversationParticipant> participants) {

    /** Defensive copy so callers cannot mutate the backing list. */
    public ConversationSnapshot {
        participants = List.copyOf(participants);
    }
}
