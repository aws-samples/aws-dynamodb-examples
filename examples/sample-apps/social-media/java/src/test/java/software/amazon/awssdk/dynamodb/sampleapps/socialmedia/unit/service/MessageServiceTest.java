package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.unit.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
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
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto.SendMessageResponse;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.exception.ConversationNotFoundException;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.exception.BatchWriteRetryExhaustedException;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.exception.MissingActorException;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.exception.NotAParticipantException;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.exception.ValidationException;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.mapper.ConversationMapper;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.mapper.MessageMapper;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.ConversationMeta;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.ConversationParticipant;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.InboxEntry;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.Message;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.MessageRequest;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.ConversationRepository;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.ConversationSnapshot;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.MessageRepository;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.service.MessageService;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.util.RequestIdentity;

/**
 * Unit coverage for the operation 8 message-send flow. No Docker or Spring context is
 * required. The repositories are mocked so the actor, conversation-existence, membership, and
 * fan-out branches are exercised in isolation. A group larger than one 25-item batch confirms the
 * service fans out to every participant.
 */
@Tag("unit")
@ExtendWith(MockitoExtension.class)
class MessageServiceTest {

    private static final int INBOX_FANOUT_MAX = 25;
    private static final String CONVERSATION_ID = "conv_alice_carol";

    @Mock
    private ConversationRepository conversationRepository;

    @Mock
    private MessageRepository messageRepository;

    private MessageService service;

    @BeforeEach
    void setUp() {
        service = new MessageService(conversationRepository, messageRepository,
                new ConversationMapper(), new MessageMapper(), INBOX_FANOUT_MAX);
    }

    @Test
    void validSendAppendsMessageAndFansOutInbox() {
        stubMembership("user_alice", groupMeta("DIRECT_MESSAGE", null));
        stubWrites();
        stubSnapshot(groupMeta("DIRECT_MESSAGE", null), "user_alice", "user_carol");

        SendMessageResponse response =
                service.sendMessage("user_alice", CONVERSATION_ID, "Are you free?").join();

        assertThat(response.conversationId()).isEqualTo(CONVERSATION_ID);
        assertThat(response.senderId()).isEqualTo("user_alice");
        assertThat(response.text()).isEqualTo("Are you free?");
        assertThat(response.messageId()).startsWith("msg_");
        assertThat(response.createdAt()).endsWith("Z");
        verify(messageRepository).putMessage(any(Message.class));
        ArgumentCaptor<List<InboxEntry>> inbox = inboxCaptor();
        verify(conversationRepository).fanOutInbox(inbox.capture(), anyInt());
        assertThat(inbox.getValue()).hasSize(2);
    }

    @Test
    void blankActorThrowsMissingActor() {
        assertThatThrownBy(() -> service.sendMessage("  ", CONVERSATION_ID, "hi"))
                .isInstanceOf(MissingActorException.class);
        verify(messageRepository, never()).putMessage(any());
    }

    @Test
    void unknownConversationRaisesConversationNotFound() {
        when(conversationRepository.getConversationMeta(eq(CONVERSATION_ID)))
                .thenReturn(CompletableFuture.completedFuture(null));
        when(conversationRepository.getParticipant(eq(CONVERSATION_ID), eq("user_alice")))
                .thenReturn(CompletableFuture.completedFuture(null));

        assertThatThrownBy(() -> service.sendMessage("user_alice", CONVERSATION_ID, "hi").join())
                .isInstanceOf(CompletionException.class)
                .hasCauseInstanceOf(ConversationNotFoundException.class);
        verify(messageRepository, never()).putMessage(any());
    }

    @Test
    void senderNotAParticipantRaisesNotAParticipant() {
        when(conversationRepository.getConversationMeta(eq(CONVERSATION_ID)))
                .thenReturn(CompletableFuture.completedFuture(groupMeta("DIRECT_MESSAGE", null)));
        when(conversationRepository.getParticipant(eq(CONVERSATION_ID), eq("user_ghost")))
                .thenReturn(CompletableFuture.completedFuture(null));

        assertThatThrownBy(() -> service.sendMessage("user_ghost", CONVERSATION_ID, "hi").join())
                .isInstanceOf(CompletionException.class)
                .hasCauseInstanceOf(NotAParticipantException.class);
        verify(messageRepository, never()).putMessage(any());
    }

    @Test
    void groupLargerThanOneBatchFansOutToEveryParticipant() {
        int groupSize = 30;
        ConversationMeta meta = groupMeta("GROUP", "Big group");
        stubMembership("user_0", meta);
        stubWrites();

        List<String> members = new ArrayList<>();
        for (int i = 0; i < groupSize; i++) {
            members.add("user_" + i);
        }
        stubSnapshot(meta, members.toArray(String[]::new));

        service.sendMessage("user_0", CONVERSATION_ID, "hello group").join();

        ArgumentCaptor<List<InboxEntry>> inbox = inboxCaptor();
        verify(conversationRepository).fanOutInbox(inbox.capture(), anyInt());
        assertThat(inbox.getValue()).hasSize(groupSize);
    }

    @Test
    void sendMessage_withMatchingClientRequestId_replaysPersistedMessageAndRepairsInbox() {
        ConversationMeta meta = groupMeta("DIRECT_MESSAGE", null);
        stubMembership("user_alice", meta);
        stubSnapshot(meta, "user_alice", "user_carol");
        when(messageRepository.getMessageRequest(eq(CONVERSATION_ID), any()))
                .thenReturn(CompletableFuture.completedFuture(messageRequest("user_alice", "Are you free?")));
        when(conversationRepository.fanOutInbox(any(), anyInt())).thenReturn(CompletableFuture.completedFuture(null));

        SendMessageResponse response = service.sendMessage("user_alice", CONVERSATION_ID,
                "Are you free?", "request_123").join();

        assertThat(response.messageId()).isEqualTo(messageRequest("user_alice", "Are you free?").getMessageId());
        verify(messageRepository, never()).putMessage(any());
        verify(messageRepository, never()).putMessageWithRequest(any(), any());
        verify(conversationRepository).fanOutInbox(any(), anyInt());
    }

    @Test
    void sendMessage_withReusedClientRequestIdAndDifferentText_failsDeterministically() {
        ConversationMeta meta = groupMeta("DIRECT_MESSAGE", null);
        stubMembership("user_alice", meta);
        when(messageRepository.getMessageRequest(eq(CONVERSATION_ID), any()))
                .thenReturn(CompletableFuture.completedFuture(messageRequest("user_alice", "Original")));

        assertThatThrownBy(() -> service.sendMessage("user_alice", CONVERSATION_ID,
                "Changed", "request_123").join())
                .isInstanceOf(CompletionException.class)
                .hasCauseInstanceOf(ValidationException.class);
        verify(conversationRepository, never()).fanOutInbox(any(), anyInt());
    }

    @Test
    void sendMessage_afterReplayableSourceWriteFailure_recoversPersistedMessageAndRepairsInbox() {
        ConversationMeta meta = groupMeta("DIRECT_MESSAGE", null);
        stubMembership("user_alice", meta);
        stubSnapshot(meta, "user_alice", "user_carol");
        MessageRequest persisted = messageRequest("user_alice", "Are you free?");
        when(messageRepository.getMessageRequest(eq(CONVERSATION_ID), any())).thenReturn(
                CompletableFuture.completedFuture(null), CompletableFuture.completedFuture(persisted));
        when(messageRepository.putMessageWithRequest(any(), any()))
                .thenReturn(CompletableFuture.failedFuture(new IllegalStateException("fan-out response lost")));
        when(conversationRepository.fanOutInbox(any(), anyInt())).thenReturn(CompletableFuture.completedFuture(null));

        SendMessageResponse response = service.sendMessage("user_alice", CONVERSATION_ID,
                "Are you free?", "request_123").join();

        assertThat(response.messageId()).isEqualTo(persisted.getMessageId());
        verify(conversationRepository).fanOutInbox(any(), anyInt());
    }

    @Test
    void sendMessage_whenInboxFanOutIsExhausted_completesExceptionally() {
        ConversationMeta meta = groupMeta("DIRECT_MESSAGE", null);
        stubMembership("user_alice", meta);
        when(messageRepository.putMessage(any())).thenReturn(CompletableFuture.completedFuture(null));
        stubSnapshot(meta, "user_alice", "user_carol");
        when(conversationRepository.fanOutInbox(any(), anyInt())).thenReturn(CompletableFuture.failedFuture(
                new BatchWriteRetryExhaustedException(2)));

        assertThatThrownBy(() -> service.sendMessage("user_alice", CONVERSATION_ID, "Are you free?").join())
                .isInstanceOf(CompletionException.class)
                .hasCauseInstanceOf(BatchWriteRetryExhaustedException.class);
        verify(messageRepository).putMessage(any(Message.class));
        verify(conversationRepository).fanOutInbox(any(), anyInt());
        verify(messageRepository, never()).putMessageWithRequest(any(), any());
    }

    @Test
    void sendMessage_whenReplayableInboxFanOutFailsAfterCommit_repairsInboxWithoutSecondSourceWrite() {
        ConversationMeta meta = groupMeta("DIRECT_MESSAGE", null);
        stubMembership("user_alice", meta);
        stubSnapshot(meta, "user_alice", "user_carol");
        MessageRequest persisted = messageRequest("user_alice", "Are you free?");
        when(messageRepository.getMessageRequest(eq(CONVERSATION_ID), any())).thenReturn(
                CompletableFuture.completedFuture(null), CompletableFuture.completedFuture(persisted));
        when(messageRepository.putMessageWithRequest(any(), any()))
                .thenReturn(CompletableFuture.completedFuture(null));
        when(conversationRepository.fanOutInbox(any(), anyInt()))
                .thenReturn(CompletableFuture.failedFuture(new BatchWriteRetryExhaustedException(1)))
                .thenReturn(CompletableFuture.completedFuture(null));

        SendMessageResponse response = service.sendMessage("user_alice", CONVERSATION_ID,
                "Are you free?", "request_123").join();

        assertThat(response.messageId()).isEqualTo(persisted.getMessageId());
        verify(messageRepository).putMessageWithRequest(any(), any());
        verify(messageRepository, never()).putMessage(any());
        verify(conversationRepository, times(2)).fanOutInbox(any(), anyInt());
    }

    private void stubMembership(String senderId, ConversationMeta meta) {
        when(conversationRepository.getConversationMeta(eq(CONVERSATION_ID)))
                .thenReturn(CompletableFuture.completedFuture(meta));
        when(conversationRepository.getParticipant(eq(CONVERSATION_ID), eq(senderId)))
                .thenReturn(CompletableFuture.completedFuture(participant(senderId)));
    }

    private void stubWrites() {
        when(messageRepository.putMessage(any()))
                .thenReturn(CompletableFuture.completedFuture(null));
        when(conversationRepository.fanOutInbox(any(), anyInt()))
                .thenReturn(CompletableFuture.completedFuture(null));
    }

    private void stubSnapshot(ConversationMeta meta, String... memberIds) {
        List<ConversationParticipant> members = new ArrayList<>();
        for (String id : memberIds) {
            members.add(participant(id));
        }
        when(conversationRepository.getSnapshot(eq(CONVERSATION_ID)))
                .thenReturn(CompletableFuture.completedFuture(new ConversationSnapshot(meta, members)));
    }

    @SuppressWarnings("unchecked")
    private static ArgumentCaptor<List<InboxEntry>> inboxCaptor() {
        return ArgumentCaptor.forClass(List.class);
    }

    private static ConversationMeta groupMeta(String type, String title) {
        ConversationMeta meta = new ConversationMeta();
        meta.setPk(ConversationMeta.partitionKey(CONVERSATION_ID));
        meta.setSk(ConversationMeta.SORT_KEY);
        meta.setEntityType(ConversationMeta.ENTITY_TYPE);
        meta.setConversationId(CONVERSATION_ID);
        meta.setType(type);
        meta.setTitle(title);
        meta.setParticipantCount(2L);
        meta.setCreatedAt("2026-05-27T12:00:00Z");
        return meta;
    }

    private static ConversationParticipant participant(String userId) {
        ConversationParticipant participant = new ConversationParticipant();
        participant.setPk(ConversationParticipant.PK_PREFIX + CONVERSATION_ID);
        participant.setSk(ConversationParticipant.sortKey(userId));
        participant.setEntityType(ConversationParticipant.ENTITY_TYPE);
        participant.setUserId(userId);
        participant.setJoinedAt("2026-05-27T12:00:00Z");
        return participant;
    }

    private static MessageRequest messageRequest(String senderId, String text) {
        String messageId = "msg_" + RequestIdentity.stableId("message:" + CONVERSATION_ID, "request_123");
        MessageRequest request = new MessageRequest();
        request.setPk(Message.partitionKey(CONVERSATION_ID));
        request.setSk(MessageRequest.sortKey(messageId));
        request.setEntityType(MessageRequest.ENTITY_TYPE);
        request.setMessageId(messageId);
        request.setConversationId(CONVERSATION_ID);
        request.setSenderId(senderId);
        request.setText(text);
        request.setCreatedAt("2026-05-27T12:00:00Z");
        request.setRequestFingerprint(RequestIdentity.messageFingerprint(senderId, text));
        return request;
    }
}
