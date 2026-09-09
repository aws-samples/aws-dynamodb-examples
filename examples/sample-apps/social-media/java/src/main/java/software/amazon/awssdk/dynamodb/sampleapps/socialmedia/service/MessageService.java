package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletableFuture;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto.SendMessageResponse;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.exception.ConversationNotFoundException;
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
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.util.IdGenerator;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.util.RequestIdentity;

/**
 * Appends a message and fans the preview out to every participant's inbox.
 *
 * <p>The observable step order is fixed regardless of client type: load the conversation metadata and the sender's membership and fail with
 * {@code CONVERSATION_NOT_FOUND} or {@code NOT_A_PARTICIPANT} before any write, {@code PutItem} the
 * {@code MESSAGE} row in the Messages table, re-load the full participant set with a query rather
 * than trusting any cached list, then upsert one {@code INBOX_ENTRY} per participant with the latest
 * preview and activity time across as many chunked {@code BatchWriteItem} batches as the group needs,
 * draining {@code UnprocessedItems}. The message write and the inbox fan-out are two sequential
 * writes across two tables, not a single cross-table transaction. A group is never silently limited
 * to one batch of 25.
 *
 * <p>The message row lives in the Messages table and inbox rows live in the Conversations table, so
 * DynamoDB cannot commit both in one transaction. If inbox fan-out fails after the message write, the
 * source row remains. A retry with the same {@code clientRequestId} uses the stored request record,
 * does not append a second message, and upserts inbox previews again. Inbox writes are deterministic
 * per participant and drain {@code UnprocessedItems}.
 *
 * <p>DynamoDB I/O stays async end-to-end so async MVC controllers compose without blocking worker
 * threads.
 */
@Service
public class MessageService {

    private static final Logger logger = LoggerFactory.getLogger(MessageService.class);

private final ConversationRepository conversationRepository;
private final MessageRepository messageRepository;
private final ConversationMapper conversationMapper;
private final MessageMapper messageMapper;

private final int inboxFanoutMax;

    /**
     * @param conversationRepository Conversations persistence boundary
     * @param messageRepository      Messages persistence boundary
     * @param conversationMapper     inbox-entry mapping
     * @param messageMapper          message-row and response mapping
     * @param inboxFanoutMax         max inbox writes per batch
     */
    public MessageService(ConversationRepository conversationRepository,
                          MessageRepository messageRepository,
                          ConversationMapper conversationMapper,
                          MessageMapper messageMapper,
                          @Value("${dynamodb.inbox-fanout-max:25}") int inboxFanoutMax) {
        this.conversationRepository = conversationRepository;
        this.messageRepository = messageRepository;
        this.conversationMapper = conversationMapper;
        this.messageMapper = messageMapper;
        this.inboxFanoutMax = inboxFanoutMax;
    }

    /**
     * Sends a message from the {@code X-User-Id} sender into {@code conversationId}.
     *
     * @param actorUserId    the sender from the {@code X-User-Id} header (required, not blank, a member)
     * @param conversationId the target conversation from the path (must exist)
     * @param text           the message body
     * @return a future completing with the send response, or failing with a mapped domain exception
     * @throws MissingActorException when {@code actorUserId} is missing or blank
     */
    public CompletableFuture<SendMessageResponse> sendMessage(String actorUserId, String conversationId,
                                                              String text) {
        return sendMessage(actorUserId, conversationId, text, null);
    }

    /**
     * Sends or replays a message from the {@code X-User-Id} sender into {@code conversationId}.
     *
     * <p>When {@code clientRequestId} is supplied, a matching retry returns the stored message and
     * repairs inbox projections instead of appending another row.
     *
     * @param actorUserId sender from the required header
     * @param conversationId target conversation
     * @param text message body
     * @param clientRequestId optional stable replay identifier
     * @return original or newly appended message after inbox fan-out completes
     */
    public CompletableFuture<SendMessageResponse> sendMessage(String actorUserId, String conversationId,
                                                               String text, String clientRequestId) {
        String senderId = requireActor(actorUserId);

        logger.debug("Sending message [senderId={}, conversationId={}]", senderId, conversationId);

        CompletableFuture<ConversationMeta> metaFuture =
                conversationRepository.getConversationMeta(conversationId);
        CompletableFuture<ConversationParticipant> membershipFuture =
                conversationRepository.getParticipant(conversationId, senderId);

        return metaFuture.thenCombine(membershipFuture, (meta, membership) -> {
            if (meta == null) {
                throw new ConversationNotFoundException(conversationId);
            }
            if (membership == null) {
                throw new NotAParticipantException(senderId, conversationId);
            }
            return meta;
        }).thenCompose(meta -> appendAndFanOut(meta, conversationId, senderId, text, clientRequestId));
    }

    /**
     * Appends the message, re-loads the full participant set, and fans out the inbox previews.
     */
    private CompletableFuture<SendMessageResponse> appendAndFanOut(ConversationMeta meta,
                                                                   String conversationId, String senderId,
                                                                    String text, String clientRequestId) {
        String messageId = messageId(conversationId, clientRequestId);
        String createdAt = nowIsoUtc();
        Message message = messageMapper.toMessage(messageId, conversationId, senderId, text, createdAt);

        if (clientRequestId != null && !clientRequestId.isBlank()) {
            String requestFingerprint = RequestIdentity.messageFingerprint(senderId, text);
            return messageRepository.getMessageRequest(conversationId, messageId)
                    .thenCompose(existing -> existing == null
                            ? persistReplayableAndFanOut(meta, conversationId, message, requestFingerprint)
                            : replayAndFanOut(meta, conversationId, existing, requestFingerprint));
        }
        return persistAndFanOut(meta, conversationId, message);
    }

    /** Persists a new message before materializing every participant inbox projection. */
    private CompletableFuture<SendMessageResponse> persistAndFanOut(ConversationMeta meta, String conversationId,
                                                                     Message message) {
        return messageRepository.putMessage(message)
                .thenCompose(ignored -> conversationRepository.getSnapshot(conversationId))
                .thenCompose(snapshot -> fanOutInbox(meta, snapshot, conversationId,
                        message.getText(), message.getCreatedAt()))
                .thenApply(ignored -> {
                    logger.debug("Message sent [messageId={}, conversationId={}]",
                            message.getMessageId(), conversationId);
                    return messageMapper.toResponse(message);
                });
    }

    /** Persists a replayable message atomically with its request record, then fans out its preview. */
    private CompletableFuture<SendMessageResponse> persistReplayableAndFanOut(ConversationMeta meta,
                                                                               String conversationId,
                                                                               Message message,
                                                                               String requestFingerprint) {
        MessageRequest messageRequest = messageMapper.toRequest(message, requestFingerprint);
        CompletableFuture<SendMessageResponse> write = messageRepository.putMessageWithRequest(message, messageRequest)
                .thenCompose(ignored -> conversationRepository.getSnapshot(conversationId))
                .thenCompose(snapshot -> fanOutInbox(meta, snapshot, conversationId,
                        message.getText(), message.getCreatedAt()))
                .thenApply(ignored -> messageMapper.toResponse(message));
        return write.handle((response, error) -> error == null
                        ? CompletableFuture.completedFuture(response)
                        : recoverReplayableWrite(error, meta, conversationId, message.getMessageId(), requestFingerprint))
                .thenCompose(future -> future);
    }

    /** Reloads a request record after a raced or interrupted replayable source write. */
    private CompletableFuture<SendMessageResponse> recoverReplayableWrite(Throwable originalFailure,
                                                                           ConversationMeta meta,
                                                                           String conversationId,
                                                                           String messageId,
                                                                           String requestFingerprint) {
        return messageRepository.getMessageRequest(conversationId, messageId).thenCompose(existing -> existing == null
                ? CompletableFuture.failedFuture(originalFailure)
                : replayAndFanOut(meta, conversationId, existing, requestFingerprint));
    }

    /** Validates a matching replay and repairs its inbox projections without appending another message. */
    private CompletableFuture<SendMessageResponse> replayAndFanOut(ConversationMeta meta, String conversationId,
                                                                    MessageRequest existing, String requestFingerprint) {
        if (!requestFingerprint.equals(existing.getRequestFingerprint())) {
            return CompletableFuture.failedFuture(
                    new ValidationException("clientRequestId was already used with different message content"));
        }
        return conversationRepository.getSnapshot(conversationId)
                .thenCompose(snapshot -> fanOutInbox(meta, snapshot, conversationId,
                        existing.getText(), existing.getCreatedAt()))
                .thenApply(ignored -> messageMapper.toResponse(existing));
    }

    /**
     * Upserts one inbox entry per participant with the new preview and activity time.
     */
    private CompletableFuture<Void> fanOutInbox(ConversationMeta meta, ConversationSnapshot snapshot,
                                                String conversationId, String text, String createdAt) {
        List<InboxEntry> entries = new ArrayList<>();
        for (ConversationParticipant participant : snapshot.participants()) {
            entries.add(conversationMapper.toInboxEntry(participant.getUserId(), conversationId,
                    meta.getType(), meta.getTitle(), createdAt, text));
        }
        return conversationRepository.fanOutInbox(entries, inboxFanoutMax);
    }

    /**
     * Validates the {@code X-User-Id} actor header.
     *
     * @param actorUserId the raw header value
     * @return the sender id
     * @throws MissingActorException when the header is missing or blank
     */
    private String requireActor(String actorUserId) {
        if (actorUserId == null || actorUserId.isBlank()) {
            throw new MissingActorException();
        }
        return actorUserId;
    }

    /** Returns a random message identity for a first attempt or a deterministic one for a replayable send. */
    private String messageId(String conversationId, String clientRequestId) {
        if (clientRequestId == null || clientRequestId.isBlank()) {
            return "msg_" + IdGenerator.timeOrderedId();
        }
        return "msg_" + RequestIdentity.stableId("message:" + conversationId, clientRequestId);
    }

    /**
     * @return the current instant truncated to whole seconds as an ISO-8601 UTC string ({@code ...Z})
     */
    private String nowIsoUtc() {
        return Instant.now().truncatedTo(ChronoUnit.SECONDS).toString();
    }
}
