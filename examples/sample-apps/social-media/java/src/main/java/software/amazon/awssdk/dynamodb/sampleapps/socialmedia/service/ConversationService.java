package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.CompletableFuture;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto.CreateConversationRequest;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto.CreateConversationResponse;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto.ConversationSnapshotResponse;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.exception.ConversationNotFoundException;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.exception.ConversationNotReadyException;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.exception.InvalidConversationTypeException;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.exception.InvalidParticipantCountException;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.exception.MissingActorException;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.exception.UserNotFoundException;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.exception.ValidationException;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.mapper.ConversationMapper;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.ConversationMeta;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.ConversationParticipant;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.ConversationType;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.InboxEntry;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.ConversationRepository;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.ConversationSnapshot;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.UserGraphRepository;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.util.IdGenerator;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.util.RequestIdentity;

/**
 * Creates a conversation shell before the first message is sent.
 *
 * <p>The observable step order is fixed regardless of client type: validate the {@code X-User-Id}
 * creator, the conversation {@code type}, the participant set (distinct, count within the type
 * bounds, creator included), and the title rules first, then confirm every participant has a
 * profile, then write the conversation. The write is a chunked single-table {@code TransactWriteItems}
 * that holds the {@code META} row plus participant rows, followed by a {@code BatchWriteItem} that
 * seeds one inbox entry per participant with a placeholder preview and {@code lastActivityAt} equal
 * to the create time. {@code TransactWriteItems} chunks at 100 items, so a group larger than
 * metadata plus 99 participants spans more than one transaction. Inbox seeding uses 25-item
 * {@code BatchWriteItem} chunks. Both writes are conditional and idempotent so a retry converges
 * without duplicates.
 *
 * <p>Business rules enforced here: the creator comes from {@code X-User-Id} and must
 * be present ({@code 400 VALIDATION_ERROR}) and appear in {@code participantUserIds}
 * ({@code 400 VALIDATION_ERROR}), an invalid {@code type} is {@code 400 INVALID_CONVERSATION_TYPE},
 * a bad count or duplicate ids is {@code 400 INVALID_PARTICIPANT_COUNT}, a title on a
 * {@code DIRECT_MESSAGE} is {@code 400 VALIDATION_ERROR}, and an unknown participant is
 * {@code 404 USER_NOT_FOUND}.
 *
 * <p>DynamoDB I/O stays async end-to-end so async MVC controllers compose without blocking worker
 * threads.
 */
@Service
public class ConversationService {

    private static final Logger logger = LoggerFactory.getLogger(ConversationService.class);

private static final int DIRECT_MESSAGE_PARTICIPANTS = 2;

private final ConversationRepository conversationRepository;
private final UserGraphRepository userGraphRepository;
private final ConversationMapper conversationMapper;

private final int inboxFanoutMax;
private final int participantMin;
private final int participantMax;

    /**
     * @param conversationRepository Conversations persistence boundary
     * @param userGraphRepository    UserGraph persistence boundary
     * @param conversationMapper     row and response mapping
     * @param inboxFanoutMax         max inbox writes per batch
     * @param participantMin         minimum participants for a group
     * @param participantMax         maximum participants for a group
     */
    public ConversationService(ConversationRepository conversationRepository,
                               UserGraphRepository userGraphRepository,
                               ConversationMapper conversationMapper,
                               @Value("${dynamodb.inbox-fanout-max:25}") int inboxFanoutMax,
                               @Value("${dynamodb.conversation-participant-min:3}") int participantMin,
                               @Value("${dynamodb.conversation-participant-max:256}") int participantMax) {
        this.conversationRepository = conversationRepository;
        this.userGraphRepository = userGraphRepository;
        this.conversationMapper = conversationMapper;
        this.inboxFanoutMax = inboxFanoutMax;
        this.participantMin = participantMin;
        this.participantMax = participantMax;
    }

    /**
     * Creates a conversation for the {@code X-User-Id} creator.
     *
     * @param actorUserId the creator from the {@code X-User-Id} header (required, not blank, a member)
     * @param request     validated conversation-create request
     * @return a future completing with the create response, or failing with a mapped domain exception
     * @throws MissingActorException            when {@code actorUserId} is missing or blank
     * @throws InvalidConversationTypeException when {@code type} is not a valid conversation type
     * @throws InvalidParticipantCountException when the participant count or distinctness rules fail
     * @throws ValidationException              when the creator is absent from the member set or a
     *     direct message carries a title
     */
    public CompletableFuture<CreateConversationResponse> createConversation(
            String actorUserId, CreateConversationRequest request) {
        String creatorId = requireActor(actorUserId);
        ConversationType type = parseType(request.type());
        List<String> participants = distinctParticipants(request.participantUserIds());
        validateCount(type, participants.size());
        validateTitle(type, request.title());
        requireCreatorIncluded(creatorId, participants);

        String conversationId = conversationId(request.clientRequestId());
        String createdAt = nowIsoUtc();
        String requestFingerprint = RequestIdentity.conversationFingerprint(
                creatorId, type.name(), request.title(), participants);

        logger.debug("Creating conversation [creatorId={}, conversationId={}, type={}, participantCount={}]",
                creatorId, conversationId, type, participants.size());

        return requireAllProfiles(participants)
                .thenCompose(ignored -> replayOrWriteConversation(conversationId, type, request.title(),
                        participants, createdAt, request.clientRequestId() != null, requestFingerprint));
    }

    /** Loads a stable request identity before writing so an identical replay can repair inbox rows. */
    private CompletableFuture<CreateConversationResponse> replayOrWriteConversation(
            String conversationId, ConversationType type, String title, List<String> participants,
            String createdAt, boolean replayable, String requestFingerprint) {
        if (!replayable) {
            return writeConversation(conversationId, type, title, participants, createdAt, null, false);
        }
        return conversationRepository.getSnapshot(conversationId).thenCompose(snapshot -> {
            if (snapshot.meta() == null) {
                return writeConversation(conversationId, type, title, participants, createdAt,
                        requestFingerprint, true);
            }
            return repairExistingConversation(snapshot.meta(), snapshot.participants(), conversationId,
                    type, title, participants, requestFingerprint);
        });
    }

    /**
     * Writes the conversation metadata and participant rows in chunked transactions, then seeds one
     * inbox entry per participant, and builds the response.
     */
    private CompletableFuture<CreateConversationResponse> writeConversation(
            String conversationId, ConversationType type, String title, List<String> participants,
            String createdAt, String requestFingerprint, boolean replayable) {
        ConversationMeta meta = conversationMapper.toMeta(
                conversationId, type.name(), title, participants.size(), createdAt);
        meta.setRequestFingerprint(requestFingerprint);
        meta.setLifecycleState(ConversationMeta.LIFECYCLE_CREATING);
        List<ConversationParticipant> participantRows = new ArrayList<>();
        for (String userId : participants) {
            participantRows.add(conversationMapper.toParticipant(conversationId, userId, createdAt));
        }
        List<InboxEntry> inboxEntries = inboxEntries(conversationId, type.name(), title, participants, createdAt);
        CompletableFuture<CreateConversationResponse> write = conversationRepository.createConversation(meta, participantRows)
                .thenCompose(ignored -> conversationRepository.fanOutInbox(inboxEntries, inboxFanoutMax))
                .thenCompose(ignored -> conversationRepository.activateConversation(conversationId))
                .thenApply(ignored -> {
                    logger.debug("Conversation created [conversationId={}, participantCount={}]",
                            conversationId, participants.size());
                    return conversationMapper.toResponse(meta);
                });
        if (!replayable) {
            return write;
        }
        return write.handle((response, error) -> error == null
                        ? CompletableFuture.completedFuture(response)
                        : recoverFailedReplayableWrite(error, conversationId, type, title, participants,
                                requestFingerprint))
                .thenCompose(future -> future);
    }

    /** Recovers an interrupted first attempt when it left matching metadata behind. */
    private CompletableFuture<CreateConversationResponse> recoverFailedReplayableWrite(
            Throwable originalFailure, String conversationId, ConversationType type, String title,
            List<String> participants, String requestFingerprint) {
        return conversationRepository.getSnapshot(conversationId).thenCompose(snapshot -> {
            if (snapshot.meta() == null) {
                return CompletableFuture.failedFuture(originalFailure);
            }
            return repairExistingConversation(snapshot.meta(), snapshot.participants(), conversationId,
                    type, title, participants, requestFingerprint);
        });
    }

    /** Repairs missing member and inbox projections for a matching replayable create. */
    private CompletableFuture<CreateConversationResponse> repairExistingConversation(
            ConversationMeta meta, List<ConversationParticipant> stored, String conversationId,
            ConversationType type, String title, List<String> participants, String requestFingerprint) {
        if (!sameConversation(meta, type, title, requestFingerprint)) {
            return CompletableFuture.failedFuture(
                    new ValidationException("clientRequestId was already used with different conversation content"));
        }
        Set<String> storedUserIds = new LinkedHashSet<>();
        for (ConversationParticipant participant : stored) {
            storedUserIds.add(participant.getUserId());
        }
        List<ConversationParticipant> missingParticipants = new ArrayList<>();
        for (String userId : participants) {
            if (!storedUserIds.contains(userId)) {
                missingParticipants.add(conversationMapper.toParticipant(
                        conversationId, userId, meta.getCreatedAt()));
            }
        }
        List<InboxEntry> entries = inboxEntries(conversationId, type.name(), title, participants,
                meta.getCreatedAt());
        return conversationRepository.repairParticipants(missingParticipants)
                .thenCompose(ignored -> conversationRepository.fanOutInbox(entries, inboxFanoutMax))
                .thenCompose(ignored -> activateIfCreating(meta))
                .thenApply(ignored -> conversationMapper.toResponse(meta));
    }

    /** Activates a recovered create exactly once after all required projections are repaired. */
    private CompletableFuture<Void> activateIfCreating(ConversationMeta meta) {
        if (!ConversationMeta.LIFECYCLE_CREATING.equals(meta.getLifecycleState())) {
            return CompletableFuture.completedFuture(null);
        }
        return conversationRepository.activateConversation(meta.getConversationId()).thenRun(
                () -> meta.setLifecycleState(ConversationMeta.LIFECYCLE_ACTIVE));
    }

    /** Builds one deterministic inbox projection per supplied conversation participant. */
    private List<InboxEntry> inboxEntries(String conversationId, String type, String title, List<String> participants,
                                          String createdAt) {
        List<InboxEntry> entries = new ArrayList<>();
        for (String userId : participants) {
            entries.add(conversationMapper.toInboxEntry(userId, conversationId, type, title,
                    createdAt, ConversationMapper.PLACEHOLDER_PREVIEW));
        }
        return entries;
    }

    /** Compares stored metadata against all behaviorally significant replayable create inputs. */
    private boolean sameConversation(ConversationMeta meta, ConversationType type, String title,
                                     String requestFingerprint) {
        return type.name().equals(meta.getType())
                && Objects.equals(title, meta.getTitle())
                && Objects.equals(requestFingerprint, meta.getRequestFingerprint());
    }

    /**
     * Reads a coherent conversation snapshot: metadata plus the full participant list.
     *
     * <p>This read is addressed by the path {@code conversationId}. It takes no {@code X-User-Id}
     * actor and applies no participant-based authorization. Any caller who knows the id receives the
     * snapshot, mirroring the timeline and inbox reads. The controller rejects a malformed id before
     * this method runs. A well-formed id with no {@code CONVERSATION_META} row fails with
     * {@link ConversationNotFoundException}.
     *
     * @param conversationId the target conversation from the path
     * @return a future completing with the snapshot response, or failing with
     *     {@link ConversationNotFoundException} when the conversation is absent
     */
    public CompletableFuture<ConversationSnapshotResponse> readSnapshot(String conversationId) {
        logger.debug("Reading conversation snapshot [conversationId={}]", conversationId);
        return conversationRepository.getSnapshot(conversationId).thenApply(snapshot -> {
            if (snapshot.meta() == null) {
                throw new ConversationNotFoundException(conversationId);
            }
            requireReadableSnapshot(snapshot, conversationId);
            logger.debug("Conversation snapshot read [conversationId={}, participantCount={}]",
                    conversationId, snapshot.participants().size());
            return conversationMapper.toSnapshotResponse(snapshot);
        });
    }

    /** Rejects a snapshot until create completion has activated matching metadata and member rows. */
    private void requireReadableSnapshot(ConversationSnapshot snapshot, String conversationId) {
        ConversationMeta meta = snapshot.meta();
        Long expectedParticipantCount = meta.getParticipantCount();
        boolean legacyOrActive = meta.getLifecycleState() == null
                || ConversationMeta.LIFECYCLE_ACTIVE.equals(meta.getLifecycleState());
        if (!legacyOrActive || expectedParticipantCount == null
                || expectedParticipantCount != snapshot.participants().size()) {
            throw new ConversationNotReadyException(conversationId);
        }
    }

    /** Confirms every participant has a profile, failing with {@link UserNotFoundException} otherwise. */
    private CompletableFuture<Void> requireAllProfiles(List<String> participants) {
        List<CompletableFuture<Void>> checks = new ArrayList<>();
        for (String userId : participants) {
            checks.add(userGraphRepository.getProfile(userId).thenAccept(profile -> {
                if (profile == null) {
                    throw new UserNotFoundException(userId);
                }
            }));
        }
        return CompletableFuture.allOf(checks.toArray(CompletableFuture[]::new));
    }

    /**
     * Parses the conversation {@code type}, rejecting a missing or unrecognized value.
     *
     * @param typeValue the raw type string
     * @return the parsed conversation type
     * @throws InvalidConversationTypeException when the value is not a valid conversation type
     */
    private ConversationType parseType(String typeValue) {
        if (typeValue == null || typeValue.isBlank()) {
            throw new InvalidConversationTypeException("type is required and must be DIRECT_MESSAGE or GROUP");
        }
        try {
            return ConversationType.valueOf(typeValue);
        } catch (IllegalArgumentException e) {
            throw new InvalidConversationTypeException("type must be DIRECT_MESSAGE or GROUP: " + typeValue);
        }
    }

    /**
     * Returns the participant ids after rejecting blanks and duplicates.
     *
     * @param participantUserIds the raw participant list
     * @return the distinct participant ids in request order
     * @throws InvalidParticipantCountException when the list is empty, blank, or has duplicates
     */
    private List<String> distinctParticipants(List<String> participantUserIds) {
        if (participantUserIds == null || participantUserIds.isEmpty()) {
            throw new InvalidParticipantCountException("participantUserIds is required");
        }
        Set<String> distinct = new LinkedHashSet<>();
        for (String userId : participantUserIds) {
            if (userId == null || userId.isBlank()) {
                throw new InvalidParticipantCountException("participantUserIds must not contain blank ids");
            }
            if (!distinct.add(userId)) {
                throw new InvalidParticipantCountException("participantUserIds must be distinct: " + userId);
            }
        }
        return new ArrayList<>(distinct);
    }

    /**
     * Validates the participant count against the conversation type bounds.
     *
     * @param type  the conversation type
     * @param count the distinct participant count
     * @throws InvalidParticipantCountException when the count is outside the type bounds
     */
    private void validateCount(ConversationType type, int count) {
        if (type == ConversationType.DIRECT_MESSAGE) {
            if (count != DIRECT_MESSAGE_PARTICIPANTS) {
                throw new InvalidParticipantCountException(
                        "DIRECT_MESSAGE requires exactly two distinct participants");
            }
            return;
        }
        if (count < participantMin || count > participantMax) {
            throw new InvalidParticipantCountException(
                    "GROUP requires between " + participantMin + " and " + participantMax + " distinct participants");
        }
    }

    /**
     * Validates the title rules: a {@code GROUP} title is optional, a {@code DIRECT_MESSAGE} must not
     * carry one.
     *
     * @param type  the conversation type
     * @param title the raw title value
     * @throws ValidationException when a direct message carries a title
     */
    private void validateTitle(ConversationType type, String title) {
        boolean hasTitle = title != null && !title.isBlank();
        if (type == ConversationType.DIRECT_MESSAGE && hasTitle) {
            throw new ValidationException("title is not allowed on a DIRECT_MESSAGE conversation");
        }
    }

    /**
     * Confirms the creator is one of the participants.
     *
     * @param creatorId    the {@code X-User-Id} creator
     * @param participants the distinct participant ids
     * @throws ValidationException when the creator is absent from the member set
     */
    private void requireCreatorIncluded(String creatorId, List<String> participants) {
        if (!participants.contains(creatorId)) {
            throw new ValidationException("the creator must be one of participantUserIds");
        }
    }

    /**
     * Validates the {@code X-User-Id} actor header.
     *
     * @param actorUserId the raw header value
     * @return the creator id
     * @throws MissingActorException when the header is missing or blank
     */
    private String requireActor(String actorUserId) {
        if (actorUserId == null || actorUserId.isBlank()) {
            throw new MissingActorException();
        }
        return actorUserId;
    }

    /** Returns a generated identity for a first attempt or a stable one for a replayable create. */
    private String conversationId(String clientRequestId) {
        if (clientRequestId == null || clientRequestId.isBlank()) {
            return "conv_" + IdGenerator.timeOrderedId();
        }
        return "conv_" + RequestIdentity.stableId("conversation", clientRequestId);
    }

    /**
     * @return the current instant truncated to whole seconds as an ISO-8601 UTC string ({@code ...Z})
     */
    private String nowIsoUtc() {
        return Instant.now().truncatedTo(ChronoUnit.SECONDS).toString();
    }
}
