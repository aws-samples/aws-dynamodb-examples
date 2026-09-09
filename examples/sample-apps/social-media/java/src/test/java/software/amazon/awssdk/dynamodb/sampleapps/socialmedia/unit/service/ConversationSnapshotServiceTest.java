package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.unit.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto.ConversationSnapshotResponse;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.exception.ConversationNotFoundException;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.exception.ConversationNotReadyException;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.mapper.ConversationMapper;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.ConversationMeta;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.ConversationParticipant;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.ConversationRepository;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.ConversationSnapshot;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.UserGraphRepository;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.service.ConversationService;

/**
 * Unit coverage for the operation 10 conversation-snapshot read. No Docker or Spring
 * context is required. The repository is mocked so the not-found branch, the response shape, the
 * ascending participant ordering, and the absence of any membership check are exercised in isolation.
 */
@Tag("unit")
@ExtendWith(MockitoExtension.class)
class ConversationSnapshotServiceTest {

    private static final int PARTICIPANT_MIN = 3;
    private static final int PARTICIPANT_MAX = 256;
    private static final int INBOX_FANOUT_MAX = 25;
    private static final String TS = "2026-01-04T00:00:00Z";

    @Mock
    private ConversationRepository conversationRepository;

    @Mock
    private UserGraphRepository userGraphRepository;

    private ConversationService service;

    @BeforeEach
    void setUp() {
        service = new ConversationService(conversationRepository, userGraphRepository,
                new ConversationMapper(), INBOX_FANOUT_MAX, PARTICIPANT_MIN, PARTICIPANT_MAX);
    }

    @Test
    void directMessageSnapshotReturnsMetadataAndTwoParticipants() {
        String conversationId = "conv_alice_bob";
        when(conversationRepository.getSnapshot(eq(conversationId)))
                .thenReturn(CompletableFuture.completedFuture(new ConversationSnapshot(
                        directMessageMeta(conversationId),
                        List.of(participant(conversationId, "user_bob"), participant(conversationId, "user_alice")))));

        ConversationSnapshotResponse response = service.readSnapshot(conversationId).join();

        assertThat(response.conversationId()).isEqualTo(conversationId);
        assertThat(response.type()).isEqualTo("DIRECT_MESSAGE");
        assertThat(response.title()).isNull();
        assertThat(response.participantCount()).isEqualTo(2L);
        assertThat(response.createdAt()).isEqualTo(TS);
        // Ordered by userId ascending regardless of the repository order.
        assertThat(response.participants())
                .extracting(ConversationSnapshotResponse.Participant::userId)
                .containsExactly("user_alice", "user_bob");
    }

    @Test
    void groupSnapshotReturnsTitleAndOrderedParticipants() {
        String conversationId = "conv_study_group";
        when(conversationRepository.getSnapshot(eq(conversationId)))
                .thenReturn(CompletableFuture.completedFuture(new ConversationSnapshot(
                        groupMeta(conversationId, "Study group", 3),
                        List.of(participant(conversationId, "user_carol"),
                                participant(conversationId, "user_alice"),
                                participant(conversationId, "user_bob")))));

        ConversationSnapshotResponse response = service.readSnapshot(conversationId).join();

        assertThat(response.type()).isEqualTo("GROUP");
        assertThat(response.title()).isEqualTo("Study group");
        assertThat(response.participantCount()).isEqualTo(3L);
        assertThat(response.participants())
                .extracting(ConversationSnapshotResponse.Participant::userId)
                .containsExactly("user_alice", "user_bob", "user_carol");
    }

    @Test
    void missingConversationRaisesConversationNotFound() {
        String conversationId = "conv_missing";
        when(conversationRepository.getSnapshot(eq(conversationId)))
                .thenReturn(CompletableFuture.completedFuture(new ConversationSnapshot(null, List.of())));

        assertThatThrownBy(() -> service.readSnapshot(conversationId).join())
                .isInstanceOf(CompletionException.class)
                .hasCauseInstanceOf(ConversationNotFoundException.class);
    }

    @Test
    void creatingConversationRaisesRetryableNotReadyError() {
        String conversationId = "conv_creating";
        ConversationMeta meta = groupMeta(conversationId, "Half written", 3);
        meta.setLifecycleState(ConversationMeta.LIFECYCLE_CREATING);
        when(conversationRepository.getSnapshot(eq(conversationId)))
                .thenReturn(CompletableFuture.completedFuture(new ConversationSnapshot(meta,
                        List.of(participant(conversationId, "user_alice")))));

        assertThatThrownBy(() -> service.readSnapshot(conversationId).join())
                .isInstanceOf(CompletionException.class)
                .hasCauseInstanceOf(ConversationNotReadyException.class);
    }

    @Test
    void activeConversationWithMissingParticipantsRaisesRetryableNotReadyError() {
        String conversationId = "conv_inconsistent";
        ConversationMeta meta = groupMeta(conversationId, "Missing member", 3);
        meta.setLifecycleState(ConversationMeta.LIFECYCLE_ACTIVE);
        when(conversationRepository.getSnapshot(eq(conversationId)))
                .thenReturn(CompletableFuture.completedFuture(new ConversationSnapshot(meta,
                        List.of(participant(conversationId, "user_alice"),
                                participant(conversationId, "user_bob")))));

        assertThatThrownBy(() -> service.readSnapshot(conversationId).join())
                .isInstanceOf(CompletionException.class)
                .hasCauseInstanceOf(ConversationNotReadyException.class);
    }

    private static ConversationMeta directMessageMeta(String conversationId) {
        ConversationMeta meta = new ConversationMeta();
        meta.setPk(ConversationMeta.partitionKey(conversationId));
        meta.setSk(ConversationMeta.SORT_KEY);
        meta.setEntityType(ConversationMeta.ENTITY_TYPE);
        meta.setConversationId(conversationId);
        meta.setType("DIRECT_MESSAGE");
        meta.setTitle(null);
        meta.setParticipantCount(2L);
        meta.setCreatedAt(TS);
        return meta;
    }

    private static ConversationMeta groupMeta(String conversationId, String title, long participantCount) {
        ConversationMeta meta = new ConversationMeta();
        meta.setPk(ConversationMeta.partitionKey(conversationId));
        meta.setSk(ConversationMeta.SORT_KEY);
        meta.setEntityType(ConversationMeta.ENTITY_TYPE);
        meta.setConversationId(conversationId);
        meta.setType("GROUP");
        meta.setTitle(title);
        meta.setParticipantCount(participantCount);
        meta.setCreatedAt(TS);
        return meta;
    }

    private static ConversationParticipant participant(String conversationId, String userId) {
        ConversationParticipant participant = new ConversationParticipant();
        participant.setPk(ConversationParticipant.PK_PREFIX + conversationId);
        participant.setSk(ConversationParticipant.sortKey(userId));
        participant.setEntityType(ConversationParticipant.ENTITY_TYPE);
        participant.setUserId(userId);
        participant.setJoinedAt(TS);
        return participant;
    }
}
