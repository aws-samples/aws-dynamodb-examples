package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.controller;

import java.util.concurrent.CompletableFuture;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto.ConversationSnapshotResponse;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto.CreateConversationRequest;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto.CreateConversationResponse;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto.ErrorResponse;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto.SendMessageRequest;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto.SendMessageResponse;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.service.ConversationService;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.service.MessageService;

/**
 * REST controller for conversation create, message send, and snapshot read.
 *
 * <p>Routes:
 * <ul>
 *   <li>{@code POST /api/v1/conversations} creates a direct message or group conversation for the
 *       {@code X-User-Id} creator (supporting route).</li>
 *   <li>{@code POST /api/v1/conversations/{conversationId}/messages} sends a message from the
 *       {@code X-User-Id} sender and fans the preview out to every participant's inbox.</li>
 *   <li>{@code GET /api/v1/conversations/{conversationId}} returns a coherent snapshot of the
 *       conversation metadata and full participant list. Addressed by the path resource, so it is
 *       not membership-gated.</li>
 * </ul>
 *
 * <p>The creator and the sender are always the {@code X-User-Id} caller, never a body field. A valid
 * create returns HTTP {@code 201} with the conversation summary. A valid send returns HTTP
 * {@code 201} with the message summary. A valid snapshot read returns HTTP {@code 200}.
 */
@RestController
@RequestMapping("/api/v1/conversations")
@Validated
@Tag(name = "Conversations", description = "Create conversations and send messages with inbox fan-out")
public class ConversationController {

    private static final Logger logger = LoggerFactory.getLogger(ConversationController.class);

private static final String CONVERSATION_ID_PATTERN = "^[A-Za-z0-9_-]+$";

private static final int MAX_CONVERSATION_ID_LENGTH = 128;

private final ConversationService conversationService;
private final MessageService messageService;

    /**
     * @param conversationService conversation-create flow
     * @param messageService      message-send flow
     */
    public ConversationController(ConversationService conversationService, MessageService messageService) {
        this.conversationService = conversationService;
        this.messageService = messageService;
    }

    /**
     * Creates a conversation for the {@code X-User-Id} creator.
     *
     * <p>A {@code DIRECT_MESSAGE} has exactly two distinct participants and no title. A {@code GROUP}
     * has a configured min..max distinct participants and an optional title. The creator must be one
     * of {@code participantUserIds}. A valid create returns HTTP {@code 201}.
     *
     * @param request     validated conversation-create payload
     * @param actorUserId creator id from the {@code X-User-Id} header (required, not blank)
     * @return HTTP 201 with the created conversation summary
     */
    @Operation(
            summary = "Create a conversation",
            description = """
                    Creates a direct message or group conversation for the X-User-Id creator. Writes \
                    the CONVERSATION_META row and one CONVERSATION_PARTICIPANT row per member across \
                    chunked conditional TransactWriteItems, then seeds one INBOX_ENTRY per member with \
                    a placeholder preview. A group larger than one 100-item transaction is created \
                    across chunks and re-run converges without duplicates. Supplying clientRequestId lets \
                    callers replay the same creation and repair its inbox projections.""")
    @ApiResponse(responseCode = "201", description = "Conversation created",
            content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE,
                    schema = @Schema(implementation = CreateConversationResponse.class)))
    @ApiResponse(responseCode = "400", description = "Missing X-User-Id, invalid type, bad participant count, or invalid title",
            content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE,
                    schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "404", description = "A participant has no profile",
            content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE,
                    schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "500", description = "Unexpected server error",
            content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE,
                    schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "503", description = "DynamoDB throttled or temporarily unavailable, retry shortly",
            content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE,
                    schema = @Schema(implementation = ErrorResponse.class)))
    @PostMapping
    public CompletableFuture<ResponseEntity<CreateConversationResponse>> createConversation(
            @Valid @RequestBody CreateConversationRequest request,
            @Parameter(description = "Authenticated creator id", required = true)
            @RequestHeader(name = "X-User-Id", required = false) String actorUserId) {
        logger.debug("Received create conversation request [type={}]", request.type());

        return conversationService.createConversation(actorUserId, request)
                .thenApply(response -> ResponseEntity.status(HttpStatus.CREATED).body(response));
    }

    /**
     * Sends a message from the {@code X-User-Id} sender into the path conversation.
     *
     * <p>The sender is the {@code X-User-Id} caller and must be a participant. The message row is
     * appended first, then every participant's inbox entry is upserted with the latest preview and
     * activity time. A valid send returns HTTP {@code 201}. A non-member sender returns
     * {@code 400 NOT_A_PARTICIPANT}, and an unknown conversation returns
     * {@code 404 CONVERSATION_NOT_FOUND}.
     *
     * @param conversationId validated conversation id from the path
     * @param request        validated message payload
     * @param actorUserId    sender id from the {@code X-User-Id} header (required, not blank)
     * @return HTTP 201 with the sent message summary
     */
    @Operation(
            summary = "Send a message",
            description = """
                    Appends the message with a PutItem in the Messages table, then upserts one \
                    INBOX_ENTRY per participant in the Conversations table across chunked \
                    BatchWriteItem batches, draining UnprocessedItems. The two writes are sequential \
                    across two tables, not a single transaction. The sender must be a participant. A \
                    clientRequestId replays the original message and repairs its inbox projections.""")
    @ApiResponse(responseCode = "201", description = "Message sent",
            content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE,
                    schema = @Schema(implementation = SendMessageResponse.class)))
    @ApiResponse(responseCode = "400", description = "Malformed conversationId, missing X-User-Id, or sender not a participant",
            content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE,
                    schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "404", description = "Unknown conversation",
            content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE,
                    schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "500", description = "Unexpected server error",
            content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE,
                    schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "503", description = "DynamoDB throttled or temporarily unavailable, retry shortly",
            content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE,
                    schema = @Schema(implementation = ErrorResponse.class)))
    @PostMapping("/{conversationId}/messages")
    public CompletableFuture<ResponseEntity<SendMessageResponse>> sendMessage(
            @PathVariable
            @Size(max = MAX_CONVERSATION_ID_LENGTH, message = "must be at most 128 characters")
            @Pattern(regexp = CONVERSATION_ID_PATTERN, message = "must match " + CONVERSATION_ID_PATTERN)
            String conversationId,
            @Valid @RequestBody SendMessageRequest request,
            @Parameter(description = "Authenticated sender id", required = true)
            @RequestHeader(name = "X-User-Id", required = false) String actorUserId) {
        logger.debug("Received send message request [conversationId={}]", conversationId);

        return messageService.sendMessage(actorUserId, conversationId, request.text(), request.clientRequestId())
                .thenApply(response -> ResponseEntity.status(HttpStatus.CREATED).body(response));
    }

    /**
     * Reads a coherent snapshot of the path conversation.
     *
     * <p>The snapshot returns the conversation metadata (type, title for groups, creation time, and
     * authoritative participant count) together with the full member list, ordered by {@code userId}.
     * The route is addressed by the path {@code conversationId}, the resource being read, so it takes
     * no {@code X-User-Id} actor and applies no participant-based authorization: any caller who knows
     * the id receives the snapshot. A malformed id returns {@code 400 VALIDATION_ERROR} before any
     * repository call, and an unknown conversation returns {@code 404 CONVERSATION_NOT_FOUND}. A
     * create that has not activated its metadata or whose participant count is incomplete returns
     * {@code 503 CONVERSATION_NOT_READY}; callers should retry shortly.
     *
     * @param conversationId validated conversation id from the path
     * @return HTTP 200 with the conversation snapshot
     */
    @Operation(
            summary = "Read a conversation snapshot",
            description = """
                    Returns the conversation metadata and full participant list as one coherent \
                    snapshot. A direct message or small group loads META and all participants in a \
                    single TransactGetItems fast path. A group larger than the 100-item transaction \
                    limit falls back to a META-only transactional read plus a participant Query. The \
                    read is addressed by the path conversationId and is not membership-gated: any \
                    caller who knows the id receives the snapshot. A CREATING lifecycle state or \
                    participant-count mismatch yields a retryable not-ready response rather than an \
                    incomplete snapshot. No message history, no pagination.""")
    @ApiResponse(responseCode = "200", description = "Conversation snapshot",
            content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE,
                    schema = @Schema(implementation = ConversationSnapshotResponse.class)))
    @ApiResponse(responseCode = "400", description = "Malformed conversationId",
            content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE,
                    schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "404", description = "Unknown conversation",
            content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE,
                    schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "500", description = "Unexpected server error",
            content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE,
                    schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "503", description = "Conversation is still creating, or DynamoDB is temporarily unavailable; retry shortly",
            content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE,
                    schema = @Schema(implementation = ErrorResponse.class)))
    @GetMapping("/{conversationId}")
    public CompletableFuture<ResponseEntity<ConversationSnapshotResponse>> getConversation(
            @PathVariable
            @Size(max = MAX_CONVERSATION_ID_LENGTH, message = "must be at most 128 characters")
            @Pattern(regexp = CONVERSATION_ID_PATTERN, message = "must match " + CONVERSATION_ID_PATTERN)
            String conversationId) {
        logger.debug("Received read conversation request [conversationId={}]", conversationId);

        return conversationService.readSnapshot(conversationId).thenApply(ResponseEntity::ok);
    }
}
