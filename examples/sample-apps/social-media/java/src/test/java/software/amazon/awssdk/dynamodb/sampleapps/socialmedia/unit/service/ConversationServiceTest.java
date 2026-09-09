package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.unit.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto.CreateConversationRequest;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto.CreateConversationResponse;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.exception.InvalidConversationTypeException;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.exception.InvalidParticipantCountException;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.exception.MissingActorException;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.exception.UserNotFoundException;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.exception.ValidationException;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.mapper.ConversationMapper;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.ConversationMeta;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.ConversationParticipant;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.InboxEntry;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.UserProfile;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.ConversationRepository;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.ConversationSnapshot;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.UserGraphRepository;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.service.ConversationService;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.util.RequestIdentity;

/**
 * Unit coverage for the operation 8 conversation-create flow. No Docker or Spring
 * context is required. The repositories are mocked so the actor, type, participant-count, title,
 * creator-membership, and profile-existence branches are exercised in isolation. A group larger than
 * one 25-item batch confirms the mapper and service build the full participant and inbox sets.
 */
@Tag("unit")
@ExtendWith(MockitoExtension.class)
class ConversationServiceTest {

    private static final int PARTICIPANT_MIN = 3;
    private static final int PARTICIPANT_MAX = 256;
    private static final int INBOX_FANOUT_MAX = 25;

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
    void validDirectMessageCreatesConversation() {
        stubProfiles("user_alice", "user_carol");
        stubWrites();

        CreateConversationResponse response = service.createConversation("user_alice",
                new CreateConversationRequest("DIRECT_MESSAGE", List.of("user_alice", "user_carol"), null)).join();

        assertThat(response.type()).isEqualTo("DIRECT_MESSAGE");
        assertThat(response.title()).isNull();
        assertThat(response.participantCount()).isEqualTo(2L);
        assertThat(response.conversationId()).startsWith("conv_");
        ArgumentCaptor<ConversationMeta> meta = ArgumentCaptor.forClass(ConversationMeta.class);
        verify(conversationRepository).createConversation(meta.capture(), participantsCaptor().capture());
        assertThat(meta.getValue().getLifecycleState()).isEqualTo(ConversationMeta.LIFECYCLE_CREATING);
        InOrder writes = inOrder(conversationRepository);
        writes.verify(conversationRepository).fanOutInbox(any(), anyInt());
        writes.verify(conversationRepository).activateConversation(meta.getValue().getConversationId());
    }

    @Test
    void validGroupCreatesConversationWithTitle() {
        stubProfiles("user_alice", "user_bob", "user_carol");
        stubWrites();

        CreateConversationResponse response = service.createConversation("user_alice",
                new CreateConversationRequest("GROUP", List.of("user_alice", "user_bob", "user_carol"),
                        "Weekend hike")).join();

        assertThat(response.type()).isEqualTo("GROUP");
        assertThat(response.title()).isEqualTo("Weekend hike");
        assertThat(response.participantCount()).isEqualTo(3L);
    }

    @Test
    void blankActorThrowsMissingActor() {
        assertThatThrownBy(() -> service.createConversation("  ",
                new CreateConversationRequest("DIRECT_MESSAGE", List.of("user_alice", "user_carol"), null)))
                .isInstanceOf(MissingActorException.class);
        verify(conversationRepository, never()).createConversation(any(), any());
    }

    @Test
    void invalidTypeThrowsInvalidConversationType() {
        assertThatThrownBy(() -> service.createConversation("user_alice",
                new CreateConversationRequest("CHANNEL", List.of("user_alice", "user_carol"), null)))
                .isInstanceOf(InvalidConversationTypeException.class);
        verify(conversationRepository, never()).createConversation(any(), any());
    }

    @Test
    void directMessageWithThreeParticipantsThrowsInvalidParticipantCount() {
        assertThatThrownBy(() -> service.createConversation("user_alice",
                new CreateConversationRequest("DIRECT_MESSAGE",
                        List.of("user_alice", "user_bob", "user_carol"), null)))
                .isInstanceOf(InvalidParticipantCountException.class);
        verify(conversationRepository, never()).createConversation(any(), any());
    }

    @Test
    void groupBelowMinimumThrowsInvalidParticipantCount() {
        assertThatThrownBy(() -> service.createConversation("user_alice",
                new CreateConversationRequest("GROUP", List.of("user_alice", "user_bob"), "Pair")))
                .isInstanceOf(InvalidParticipantCountException.class);
        verify(conversationRepository, never()).createConversation(any(), any());
    }

    @Test
    void duplicateParticipantsThrowInvalidParticipantCount() {
        assertThatThrownBy(() -> service.createConversation("user_alice",
                new CreateConversationRequest("DIRECT_MESSAGE", List.of("user_alice", "user_alice"), null)))
                .isInstanceOf(InvalidParticipantCountException.class);
        verify(conversationRepository, never()).createConversation(any(), any());
    }

    @Test
    void titleOnDirectMessageThrowsValidationError() {
        assertThatThrownBy(() -> service.createConversation("user_alice",
                new CreateConversationRequest("DIRECT_MESSAGE", List.of("user_alice", "user_carol"), "Nope")))
                .isInstanceOf(ValidationException.class);
        verify(conversationRepository, never()).createConversation(any(), any());
    }

    @Test
    void creatorNotInParticipantsThrowsValidationError() {
        assertThatThrownBy(() -> service.createConversation("user_alice",
                new CreateConversationRequest("DIRECT_MESSAGE", List.of("user_bob", "user_carol"), null)))
                .isInstanceOf(ValidationException.class);
        verify(conversationRepository, never()).createConversation(any(), any());
    }

    @Test
    void unknownParticipantRaisesUserNotFound() {
        when(userGraphRepository.getProfile(eq("user_alice")))
                .thenReturn(CompletableFuture.completedFuture(profile("user_alice")));
        when(userGraphRepository.getProfile(eq("user_ghost")))
                .thenReturn(CompletableFuture.completedFuture(null));

        assertThatThrownBy(() -> service.createConversation("user_alice",
                new CreateConversationRequest("DIRECT_MESSAGE", List.of("user_alice", "user_ghost"), null)).join())
                .isInstanceOf(CompletionException.class)
                .hasCauseInstanceOf(UserNotFoundException.class);
        verify(conversationRepository, never()).createConversation(any(), any());
    }

    @Test
    void groupLargerThanOneBatchWritesEveryParticipantAndInbox() {
        int groupSize = 30;
        List<String> members = new ArrayList<>();
        for (int i = 0; i < groupSize; i++) {
            String id = "user_" + i;
            members.add(id);
            when(userGraphRepository.getProfile(eq(id)))
                    .thenReturn(CompletableFuture.completedFuture(profile(id)));
        }
        stubWrites();

        CreateConversationResponse response = service.createConversation("user_0",
                new CreateConversationRequest("GROUP", members, "Big group")).join();

        assertThat(response.participantCount()).isEqualTo((long) groupSize);
        ArgumentCaptor<List<ConversationParticipant>> participants = participantsCaptor();
        verify(conversationRepository).createConversation(any(ConversationMeta.class), participants.capture());
        assertThat(participants.getValue()).hasSize(groupSize);
        ArgumentCaptor<List<InboxEntry>> inbox = inboxCaptor();
        verify(conversationRepository).fanOutInbox(inbox.capture(), anyInt());
        assertThat(inbox.getValue()).hasSize(groupSize);
    }

    @Test
    void matchingClientRequestIdReplaysStoredConversation() {
        List<String> members = List.of("user_alice", "user_bob", "user_carol");
        stubProfiles(members.toArray(String[]::new));
        ConversationMeta meta = replayableMeta("user_alice", "GROUP", "Weekend hike", members);
        when(conversationRepository.getSnapshot(any()))
                .thenReturn(CompletableFuture.completedFuture(new ConversationSnapshot(meta, participantRows(members))));
        when(conversationRepository.repairParticipants(any())).thenReturn(CompletableFuture.completedFuture(null));
        when(conversationRepository.fanOutInbox(any(), anyInt())).thenReturn(CompletableFuture.completedFuture(null));

        CreateConversationResponse response = service.createConversation("user_alice",
                new CreateConversationRequest("GROUP", members, "Weekend hike", "request_123")).join();

        assertThat(response.conversationId()).isEqualTo(meta.getConversationId());
        verify(conversationRepository, never()).createConversation(any(), any());
        verify(conversationRepository).repairParticipants(List.of());
    }

    @Test
    void reusedClientRequestIdWithDifferentCreatorFailsDeterministically() {
        List<String> members = List.of("user_alice", "user_bob", "user_carol");
        stubProfiles(members.toArray(String[]::new));
        ConversationMeta meta = replayableMeta("user_alice", "GROUP", "Weekend hike", members);
        when(conversationRepository.getSnapshot(any()))
                .thenReturn(CompletableFuture.completedFuture(new ConversationSnapshot(meta, participantRows(members))));

        assertThatThrownBy(() -> service.createConversation("user_bob",
                new CreateConversationRequest("GROUP", members, "Weekend hike", "request_123")).join())
                .isInstanceOf(CompletionException.class)
                .hasCauseInstanceOf(ValidationException.class);
        verify(conversationRepository, never()).repairParticipants(any());
    }

    @Test
    void replayRepairsOnlyMissingParticipantsAfterInterruptedCreate() {
        List<String> members = List.of("user_alice", "user_bob", "user_carol");
        stubProfiles(members.toArray(String[]::new));
        ConversationMeta meta = replayableMeta("user_alice", "GROUP", "Weekend hike", members);
        meta.setLifecycleState(ConversationMeta.LIFECYCLE_CREATING);
        when(conversationRepository.getSnapshot(any())).thenReturn(CompletableFuture.completedFuture(
                new ConversationSnapshot(meta, participantRows(members.subList(0, 2)))));
        when(conversationRepository.repairParticipants(any())).thenReturn(CompletableFuture.completedFuture(null));
        when(conversationRepository.fanOutInbox(any(), anyInt())).thenReturn(CompletableFuture.completedFuture(null));
        when(conversationRepository.activateConversation(any())).thenReturn(CompletableFuture.completedFuture(null));

        service.createConversation("user_alice",
                new CreateConversationRequest("GROUP", members, "Weekend hike", "request_123")).join();

        ArgumentCaptor<List<ConversationParticipant>> repaired = participantsCaptor();
        verify(conversationRepository).repairParticipants(repaired.capture());
        assertThat(repaired.getValue()).extracting(ConversationParticipant::getUserId)
                .containsExactly("user_carol");
    }

    @Test
    void failedFirstAttemptConvergesWhenMatchingPartialConversationWasPersisted() {
        List<String> members = List.of("user_alice", "user_bob", "user_carol");
        stubProfiles(members.toArray(String[]::new));
        ConversationMeta meta = replayableMeta("user_alice", "GROUP", "Weekend hike", members);
        meta.setLifecycleState(ConversationMeta.LIFECYCLE_CREATING);
        when(conversationRepository.getSnapshot(any())).thenReturn(
                CompletableFuture.completedFuture(new ConversationSnapshot(null, List.of())),
                CompletableFuture.completedFuture(new ConversationSnapshot(meta, participantRows(members.subList(0, 2)))));
        when(conversationRepository.createConversation(any(), any()))
                .thenReturn(CompletableFuture.failedFuture(new IllegalStateException("second chunk interrupted")));
        when(conversationRepository.repairParticipants(any())).thenReturn(CompletableFuture.completedFuture(null));
        when(conversationRepository.fanOutInbox(any(), anyInt())).thenReturn(CompletableFuture.completedFuture(null));
        when(conversationRepository.activateConversation(any())).thenReturn(CompletableFuture.completedFuture(null));

        CreateConversationResponse response = service.createConversation("user_alice",
                new CreateConversationRequest("GROUP", members, "Weekend hike", "request_123")).join();

        assertThat(response.conversationId()).isEqualTo("conv_replayed");
        ArgumentCaptor<List<ConversationParticipant>> repaired = participantsCaptor();
        verify(conversationRepository).repairParticipants(repaired.capture());
        assertThat(repaired.getValue()).extracting(ConversationParticipant::getUserId)
                .containsExactly("user_carol");
    }

    private void stubProfiles(String... userIds) {
        for (String userId : userIds) {
            when(userGraphRepository.getProfile(eq(userId)))
                    .thenReturn(CompletableFuture.completedFuture(profile(userId)));
        }
    }

    private void stubWrites() {
        when(conversationRepository.createConversation(any(), any()))
                .thenReturn(CompletableFuture.completedFuture(null));
        when(conversationRepository.fanOutInbox(any(), anyInt()))
                .thenReturn(CompletableFuture.completedFuture(null));
        when(conversationRepository.activateConversation(any()))
                .thenReturn(CompletableFuture.completedFuture(null));
    }

    @SuppressWarnings("unchecked")
    private static ArgumentCaptor<List<ConversationParticipant>> participantsCaptor() {
        return ArgumentCaptor.forClass(List.class);
    }

    @SuppressWarnings("unchecked")
    private static ArgumentCaptor<List<InboxEntry>> inboxCaptor() {
        return ArgumentCaptor.forClass(List.class);
    }

    private static UserProfile profile(String userId) {
        UserProfile profile = new UserProfile();
        profile.setPk(UserProfile.partitionKey(userId));
        profile.setSk(UserProfile.SORT_KEY);
        profile.setEntityType(UserProfile.ENTITY_TYPE);
        profile.setUserId(userId);
        profile.setDisplayName(userId);
        profile.setCreatedAt("2026-05-27T10:00:00Z");
        return profile;
    }

    private static ConversationMeta replayableMeta(String creatorId, String type, String title,
                                                   List<String> members) {
        ConversationMeta meta = new ConversationMapper().toMeta("conv_replayed", type, title,
                members.size(), "2026-05-27T10:00:00Z");
        meta.setRequestFingerprint(RequestIdentity.conversationFingerprint(creatorId, type, title, members));
        return meta;
    }

    private static List<ConversationParticipant> participantRows(List<String> userIds) {
        ConversationMapper mapper = new ConversationMapper();
        return userIds.stream()
                .map(userId -> mapper.toParticipant("conv_replayed", userId, "2026-05-27T10:00:00Z"))
                .toList();
    }
}
