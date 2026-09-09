package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.service;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.function.Function;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.config.NotificationWriteConcurrency;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.config.TimelineFanoutMode;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.mapper.NotificationMapper;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.ConversationParticipant;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.FollowerEdge;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.Message;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.PostMeta;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.Visibility;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.ConversationRepository;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.NotificationRepository;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.UserGraphRepository;

/**
 * Projects stream inserts into idempotent notification rows and, in {@code ASYNC} mode, materializes
 * the deferred timeline fan-out.
 *
 * <p>This is the business core the in-process stream consumer drives. It has no HTTP surface. For a
 * {@code POST_META} insert it resolves recipients by visibility (followers up to
 * {@code dynamodb.follower-fanout-cap} for {@code PUBLIC}, the
 * allow list for {@code RESTRICTED}, none for {@code PRIVATE}, and never the author) and writes one
 * conditional notification per recipient. When {@code dynamodb.timeline-fanout-mode=ASYNC} it also runs
 * the same visibility-scoped timeline fan-out the publish request would have run in {@code SYNC} mode,
 * so both modes yield identical timelines. For a {@code MESSAGE} insert it queries only
 * conversation participant rows and writes one notification per participant except the sender.
 *
 * <p>Notification writes run in sequential chunks of {@code dynamodb.notification-write-concurrency}.
 * Writes inside a chunk start together. The next chunk starts only after the current chunk completes.
 * Recipient order across chunks matches the resolved list. Completion order inside a chunk is not
 * defined. If a chunk completes exceptionally, later chunks are not started. Each write remains a
 * conditional {@code PutItem} ({@code attribute_not_exists(SK)}).
 *
 * <p>Every write is idempotent: the notification key is derived deterministically from the source
 * event and guarded by {@code attribute_not_exists(SK)}, and timeline rows are keyed by
 * recipient plus source post. Re-processing after a restart or a duplicate delivery is safe. DynamoDB
 * I/O stays async end-to-end.
 */
@Service
public class NotificationProjectionService {

    private static final Logger logger = LoggerFactory.getLogger(NotificationProjectionService.class);

    private final UserGraphRepository userGraphRepository;
    private final ConversationRepository conversationRepository;
    private final NotificationRepository notificationRepository;
    private final TimelineFanoutService timelineFanoutService;
    private final NotificationMapper notificationMapper;
    private final TimelineFanoutMode fanoutMode;
    private final int writeConcurrency;

    /**
     * @param userGraphRepository    UserGraph persistence boundary
     * @param conversationRepository Conversations persistence boundary
     * @param notificationRepository Notifications persistence boundary
     * @param timelineFanoutService  shared timeline fan-out
     * @param notificationMapper     notification-row mapping
     * @param fanoutMode             fan-out mode, {@code SYNC} or {@code ASYNC}
     * @param writeConcurrency       max concurrent notification writes per chunk
     */
    public NotificationProjectionService(UserGraphRepository userGraphRepository,
                                         ConversationRepository conversationRepository,
                                         NotificationRepository notificationRepository,
                                         TimelineFanoutService timelineFanoutService,
                                         NotificationMapper notificationMapper,
                                         TimelineFanoutMode fanoutMode,
                                         NotificationWriteConcurrency writeConcurrency) {
        this.userGraphRepository = userGraphRepository;
        this.conversationRepository = conversationRepository;
        this.notificationRepository = notificationRepository;
        this.timelineFanoutService = timelineFanoutService;
        this.notificationMapper = notificationMapper;
        this.fanoutMode = fanoutMode;
        this.writeConcurrency = writeConcurrency.value();
    }

    /**
     * Projects a {@code POST_META} insert: writes visibility-scoped notifications and, in
     * {@code ASYNC} mode, the deferred timeline fan-out.
     *
     * @param meta the source post row reconstructed from the stream new image
     * @return a future completing when notifications and any ASYNC timeline copies are written
     */
    public CompletableFuture<Void> projectPost(PostMeta meta) {
        CompletableFuture<Void> notifications = resolvePostRecipients(meta)
                .thenCompose(recipients -> writePostNotifications(meta, recipients));
        if (fanoutMode != TimelineFanoutMode.ASYNC) {
            return notifications;
        }
        return notifications.thenCompose(ignored -> timelineFanoutService.fanOut(meta));
    }

    /**
     * Projects a {@code MESSAGE} insert: writes one notification per conversation participant except
     * the sender.
     *
     * <p>Recipients come from a strongly consistent participant {@code Query}. Conversation metadata
     * is not loaded. {@code TransactGetItems} is not used.
     *
     * @param message the source message row reconstructed from the stream new image
     * @return a future completing when notifications are written
     */
    public CompletableFuture<Void> projectMessage(Message message) {
        return conversationRepository.queryParticipants(message.getConversationId())
                .thenCompose(participants -> {
                    List<String> recipients = new ArrayList<>();
                    for (ConversationParticipant participant : participants) {
                        if (!participant.getUserId().equals(message.getSenderId())) {
                            recipients.add(participant.getUserId());
                        }
                    }
                    return writeMessageNotifications(message, recipients);
                });
    }

    /** Resolves the notification recipients for a post by visibility, always excluding the author. */
    private CompletableFuture<List<String>> resolvePostRecipients(PostMeta meta) {
        Visibility visibility = Visibility.valueOf(meta.getVisibility());
        return switch (visibility) {
            case PRIVATE -> CompletableFuture.completedFuture(List.of());
            case RESTRICTED -> CompletableFuture.completedFuture(
                    excludeAuthor(meta.getAllowedViewerUserIds(), meta.getAuthorId()));
            case PUBLIC -> userGraphRepository.queryFollowers(meta.getAuthorId())
                    .thenApply(result -> {
                        result.warnIfTruncated(logger, meta.getAuthorId());
                        return excludeAuthor(result.followers().stream()
                                .map(FollowerEdge::getFollowerId)
                                .toList(), meta.getAuthorId());
                    });
        };
    }

    /**
     * Writes one conditional notification per post recipient in bounded chunks.
     *
     * @param meta       source post
     * @param recipients visibility-scoped recipients
     * @return future completing when every chunk has finished
     */
    private CompletableFuture<Void> writePostNotifications(PostMeta meta, List<String> recipients) {
        logger.debug("Projected post notifications [postId={}, recipients={}]",
                meta.getPostId(), recipients.size());
        return writeInChunks(recipients, recipient ->
                notificationRepository.putNotificationIfAbsent(notificationMapper.forPost(recipient, meta)));
    }

    /**
     * Writes one conditional notification per message recipient in bounded chunks.
     *
     * @param message    source message
     * @param recipients participants except the sender
     * @return future completing when every chunk has finished
     */
    private CompletableFuture<Void> writeMessageNotifications(Message message, List<String> recipients) {
        logger.debug("Projected message notifications [messageId={}, recipients={}]",
                message.getMessageId(), recipients.size());
        return writeInChunks(recipients, recipient ->
                notificationRepository.putNotificationIfAbsent(
                        notificationMapper.forMessage(recipient, message)));
    }

    /**
     * Starts at most {@code writeConcurrency} writes at a time. The next chunk is composed only after
     * the current chunk completes, so a failed chunk does not start later recipients.
     *
     * @param recipients recipient user ids in write order
     * @param write      conditional notification write for one recipient
     * @return future completing when every recipient has been attempted, or failing with the first
     *     chunk error
     */
    private CompletableFuture<Void> writeInChunks(List<String> recipients,
                                                  Function<String, CompletableFuture<Boolean>> write) {
        if (recipients.isEmpty()) {
            return CompletableFuture.completedFuture(null);
        }
        return writeChunk(recipients, 0, write);
    }

    /**
     * Issues one concurrent chunk starting at {@code offset}, then continues from the next offset.
     *
     * @param recipients recipient user ids
     * @param offset     first recipient index for this chunk
     * @param write      conditional notification write for one recipient
     * @return future for this chunk and every later chunk
     */
    private CompletableFuture<Void> writeChunk(List<String> recipients,
                                               int offset,
                                               Function<String, CompletableFuture<Boolean>> write) {
        if (offset >= recipients.size()) {
            return CompletableFuture.completedFuture(null);
        }
        int end = Math.min(offset + writeConcurrency, recipients.size());
        List<CompletableFuture<Boolean>> chunk = new ArrayList<>(end - offset);
        for (int i = offset; i < end; i++) {
            chunk.add(write.apply(recipients.get(i)));
        }
        return CompletableFuture.allOf(chunk.toArray(CompletableFuture[]::new))
                .thenCompose(ignored -> writeChunk(recipients, end, write));
    }

    /** Returns the recipient list with the author removed and blanks filtered out. */
    private List<String> excludeAuthor(List<String> recipients, String authorId) {
        if (recipients == null) {
            return List.of();
        }
        List<String> filtered = new ArrayList<>();
        for (String recipient : recipients) {
            if (recipient != null && !recipient.isBlank() && !recipient.equals(authorId)) {
                filtered.add(recipient);
            }
        }
        return filtered;
    }
}
