package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.unit.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;
import java.util.concurrent.atomic.AtomicInteger;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.config.NotificationWriteConcurrency;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.config.TimelineFanoutMode;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.mapper.NotificationMapper;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.ConversationParticipant;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.FollowerEdge;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.Message;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.Notification;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.PostMeta;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.ConversationRepository;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.FollowerQueryResult;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.NotificationRepository;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.UserGraphRepository;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.service.NotificationProjectionService;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.service.TimelineFanoutService;

/**
 * Unit coverage for the operation 11 projection logic. No Docker or Spring context
 * is required. Repositories and the shared fan-out are mocked so recipient derivation (visibility,
 * author exclusion, sender exclusion, and the follower-enumeration cap), bounded write chunks, and
 * the {@code SYNC}/{@code ASYNC} timeline branch are exercised in isolation. The real
 * {@link NotificationMapper} keeps the row shape honest.
 */
@Tag("unit")
@ExtendWith(MockitoExtension.class)
class NotificationProjectionServiceTest {

    private static final String CREATED_AT = "2026-05-27T10:00:00Z";

    @Mock
    private UserGraphRepository userGraphRepository;

    @Mock
    private ConversationRepository conversationRepository;

    @Mock
    private NotificationRepository notificationRepository;

    @Mock
    private TimelineFanoutService timelineFanoutService;

    /**
     * Builds a projection service in {@code SYNC} mode with default write concurrency.
     *
     * @return service that skips deferred timeline fan-out
     */
    private NotificationProjectionService syncService() {
        return service(TimelineFanoutMode.SYNC, 25);
    }

    /**
     * Builds a projection service for the supplied fan-out mode and write concurrency.
     *
     * @param mode         {@code SYNC} or {@code ASYNC}
     * @param concurrency  max concurrent notification writes
     * @return service wired with mocked repositories
     */
    private NotificationProjectionService service(TimelineFanoutMode mode, int concurrency) {
        return new NotificationProjectionService(userGraphRepository, conversationRepository,
                notificationRepository, timelineFanoutService, new NotificationMapper(), mode,
                new NotificationWriteConcurrency(concurrency));
    }

    @Test
    void publicPostNotifiesEveryFollowerExceptAuthor() {
        stubNotificationWrite();
        when(userGraphRepository.queryFollowers(eq("user_author")))
                .thenReturn(CompletableFuture.completedFuture(new FollowerQueryResult(List.of(
                        followerEdge("user_bob"), followerEdge("user_carol"), followerEdge("user_author")))));

        syncService().projectPost(postMeta("post_1", "user_author", "PUBLIC", null)).join();

        assertThat(capturedRecipients()).containsExactlyInAnyOrder("user_bob", "user_carol");
        verify(timelineFanoutService, never()).fanOut(any());
    }

    @Test
    void publicPostNotifiesOnlyReturnedFollowersWhenCapExceeded() {
        stubNotificationWrite();
        when(userGraphRepository.queryFollowers(eq("user_author")))
                .thenReturn(CompletableFuture.completedFuture(new FollowerQueryResult(
                        List.of(followerEdge("user_a"), followerEdge("user_b")), false, 2)));

        syncService().projectPost(postMeta("post_5", "user_author", "PUBLIC", null)).join();

        assertThat(capturedRecipients()).containsExactly("user_a", "user_b");
        verify(timelineFanoutService, never()).fanOut(any());
    }

    @Test
    void restrictedPostNotifiesAllowListOnly() {
        stubNotificationWrite();

        syncService().projectPost(
                postMeta("post_2", "user_author", "RESTRICTED", List.of("user_bob", "user_carol"))).join();

        assertThat(capturedRecipients()).containsExactlyInAnyOrder("user_bob", "user_carol");
        verify(userGraphRepository, never()).queryFollowers(any());
    }

    @Test
    void privatePostNotifiesNobody() {
        syncService().projectPost(postMeta("post_3", "user_author", "PRIVATE", null)).join();

        verify(notificationRepository, never()).putNotificationIfAbsent(any());
        verify(userGraphRepository, never()).queryFollowers(any());
    }

    @Test
    void asyncModeAlsoFansOutTimeline() {
        stubNotificationWrite();
        when(userGraphRepository.queryFollowers(eq("user_author")))
                .thenReturn(CompletableFuture.completedFuture(new FollowerQueryResult(List.of(followerEdge("user_bob")))));
        PostMeta meta = postMeta("post_4", "user_author", "PUBLIC", null);
        when(timelineFanoutService.fanOut(eq(meta))).thenReturn(CompletableFuture.completedFuture(null));

        service(TimelineFanoutMode.ASYNC, 25).projectPost(meta).join();

        verify(timelineFanoutService).fanOut(eq(meta));
    }

    @Test
    void messageNotifiesEveryParticipantExceptSender() {
        stubNotificationWrite();
        stubQueryParticipants("conv_1",
                List.of(participant("user_sender"), participant("user_bob"), participant("user_carol")));

        syncService().projectMessage(message("msg_1", "conv_1", "user_sender")).join();

        assertThat(capturedRecipients()).containsExactlyInAnyOrder("user_bob", "user_carol");
        verify(conversationRepository).queryParticipants(eq("conv_1"));
        verify(conversationRepository, never()).getSnapshot(any());
    }

    @Test
    void projectMessage_whenNoParticipants_writesNothing() {
        stubQueryParticipants("conv_1", List.of());

        syncService().projectMessage(message("msg_empty", "conv_1", "user_sender")).join();

        verify(notificationRepository, never()).putNotificationIfAbsent(any());
        verify(conversationRepository, never()).getSnapshot(any());
    }

    @Test
    void projectMessage_whenOnlySender_writesNothing() {
        stubQueryParticipants("conv_1", List.of(participant("user_sender")));

        syncService().projectMessage(message("msg_solo", "conv_1", "user_sender")).join();

        verify(notificationRepository, never()).putNotificationIfAbsent(any());
        verify(conversationRepository, never()).getSnapshot(any());
    }

    @Test
    void projectMessage_whenParticipantQueryFails_doesNotWrite() {
        when(conversationRepository.queryParticipants(eq("conv_1")))
                .thenReturn(CompletableFuture.failedFuture(new IllegalStateException("participant query failed")));

        assertThatThrownBy(() ->
                syncService().projectMessage(message("msg_fail", "conv_1", "user_sender")).join())
                .isInstanceOf(CompletionException.class);

        verify(notificationRepository, never()).putNotificationIfAbsent(any());
        verify(conversationRepository, never()).getSnapshot(any());
    }

    @Test
    void projectPost_whenFiveRecipientsAndConcurrencyTwo_neverExceedsTwoInFlight() {
        ControllableWrites writes = stubControllableWrites();
        when(userGraphRepository.queryFollowers(eq("user_author")))
                .thenReturn(CompletableFuture.completedFuture(new FollowerQueryResult(List.of(
                        followerEdge("user_a"), followerEdge("user_b"), followerEdge("user_c"),
                        followerEdge("user_d"), followerEdge("user_e")))));

        CompletableFuture<Void> projection = service(TimelineFanoutMode.SYNC, 2)
                .projectPost(postMeta("post_6", "user_author", "PUBLIC", null));

        assertThat(writes.started()).isEqualTo(2);
        writes.completeNext(2);
        assertThat(writes.started()).isEqualTo(4);
        writes.completeNext(2);
        assertThat(writes.started()).isEqualTo(5);
        writes.completeNext(1);
        projection.join();

        assertThat(writes.maxInFlight()).isEqualTo(2);
        assertThat(capturedRecipients()).containsExactly("user_a", "user_b", "user_c", "user_d", "user_e");
    }

    @Test
    void projectPost_whenRecipientCountEqualsConcurrency_startsOneChunk() {
        ControllableWrites writes = stubControllableWrites();
        when(userGraphRepository.queryFollowers(eq("user_author")))
                .thenReturn(CompletableFuture.completedFuture(new FollowerQueryResult(List.of(
                        followerEdge("user_a"), followerEdge("user_b")))));

        CompletableFuture<Void> projection = service(TimelineFanoutMode.SYNC, 2)
                .projectPost(postMeta("post_7", "user_author", "PUBLIC", null));

        assertThat(writes.started()).isEqualTo(2);
        writes.completeNext(2);
        projection.join();

        verify(notificationRepository, times(2)).putNotificationIfAbsent(any());
        assertThat(writes.maxInFlight()).isEqualTo(2);
    }

    @Test
    void projectPost_whenChunkFails_doesNotStartLaterRecipients() {
        ControllableWrites writes = stubControllableWrites();
        when(userGraphRepository.queryFollowers(eq("user_author")))
                .thenReturn(CompletableFuture.completedFuture(new FollowerQueryResult(List.of(
                        followerEdge("user_a"), followerEdge("user_b"), followerEdge("user_c")))));

        CompletableFuture<Void> projection = service(TimelineFanoutMode.ASYNC, 2)
                .projectPost(postMeta("post_8", "user_author", "PUBLIC", null));

        assertThat(writes.started()).isEqualTo(2);
        writes.failNext();
        writes.completeNext(1);

        assertThatThrownBy(projection::join).isInstanceOf(CompletionException.class);
        assertThat(writes.started()).isEqualTo(2);
        verify(timelineFanoutService, never()).fanOut(any());
    }

    @Test
    void projectMessage_whenFiveRecipientsAndConcurrencyTwo_writesEveryParticipant() {
        ControllableWrites writes = stubControllableWrites();
        stubQueryParticipants("conv_1", List.of(
                participant("user_sender"), participant("user_a"), participant("user_b"),
                participant("user_c"), participant("user_d"), participant("user_e")));

        CompletableFuture<Void> projection = service(TimelineFanoutMode.SYNC, 2)
                .projectMessage(message("msg_2", "conv_1", "user_sender"));

        assertThat(writes.started()).isEqualTo(2);
        writes.completeNext(2);
        writes.completeNext(2);
        writes.completeNext(1);
        projection.join();

        assertThat(writes.maxInFlight()).isEqualTo(2);
        assertThat(capturedRecipients()).containsExactly("user_a", "user_b", "user_c", "user_d", "user_e");
        verify(conversationRepository, never()).getSnapshot(any());
    }

    /**
     * Stubs each notification write as an incomplete future the test can complete later.
     *
     * @return handle for started and in-flight writes
     */
    private ControllableWrites stubControllableWrites() {
        ControllableWrites writes = new ControllableWrites();
        when(notificationRepository.putNotificationIfAbsent(any())).thenAnswer(invocation -> {
            CompletableFuture<Boolean> future = new CompletableFuture<>();
            writes.recordStart(future);
            return future.whenComplete((value, error) -> writes.recordCompletion());
        });
        return writes;
    }

    /**
     * Stubs a successful immediate notification write.
     */
    private void stubNotificationWrite() {
        when(notificationRepository.putNotificationIfAbsent(any()))
                .thenReturn(CompletableFuture.completedFuture(true));
    }

    /**
     * Stubs the participant-only conversation read used by message projection.
     *
     * @param conversationId conversation whose members are listed
     * @param participants   rows returned by the query
     */
    private void stubQueryParticipants(String conversationId, List<ConversationParticipant> participants) {
        when(conversationRepository.queryParticipants(eq(conversationId)))
                .thenReturn(CompletableFuture.completedFuture(participants));
    }

    private List<String> capturedRecipients() {
        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository, atLeastOnce()).putNotificationIfAbsent(captor.capture());
        return captor.getAllValues().stream().map(Notification::getRecipientUserId).toList();
    }

    private static PostMeta postMeta(String postId, String authorId, String visibility, List<String> allowList) {
        PostMeta meta = new PostMeta();
        meta.setPostId(postId);
        meta.setAuthorId(authorId);
        meta.setType("POST");
        meta.setVisibility(visibility);
        meta.setAllowedViewerUserIds(allowList);
        meta.setCreatedAt(CREATED_AT);
        return meta;
    }

    private static Message message(String messageId, String conversationId, String senderId) {
        Message message = new Message();
        message.setMessageId(messageId);
        message.setConversationId(conversationId);
        message.setSenderId(senderId);
        message.setCreatedAt(CREATED_AT);
        return message;
    }

    private static FollowerEdge followerEdge(String followerId) {
        FollowerEdge edge = new FollowerEdge();
        edge.setFollowerId(followerId);
        return edge;
    }

    /**
     * Builds a participant fixture that carries only the user id used for sender exclusion.
     *
     * @param userId member id
     * @return participant row
     */
    private static ConversationParticipant participant(String userId) {
        ConversationParticipant participant = new ConversationParticipant();
        participant.setUserId(userId);
        return participant;
    }

    /**
     * Incomplete write futures used to prove chunked concurrency.
     */
    private static final class ControllableWrites {

        private final Deque<CompletableFuture<Boolean>> pending = new ArrayDeque<>();
        private final AtomicInteger started = new AtomicInteger();
        private final AtomicInteger inFlight = new AtomicInteger();
        private final AtomicInteger maxInFlight = new AtomicInteger();

        /**
         * Records that a write has started and is waiting to be completed.
         *
         * @param future incomplete write
         */
        private void recordStart(CompletableFuture<Boolean> future) {
            started.incrementAndGet();
            int current = inFlight.incrementAndGet();
            maxInFlight.updateAndGet(max -> Math.max(max, current));
            pending.addLast(future);
        }

        /**
         * Records that a started write has completed.
         */
        private void recordCompletion() {
            inFlight.decrementAndGet();
        }

        /**
         * @return number of writes started so far
         */
        private int started() {
            return started.get();
        }

        /**
         * @return highest observed in-flight count
         */
        private int maxInFlight() {
            return maxInFlight.get();
        }

        /**
         * Completes the next {@code count} started writes successfully.
         *
         * @param count number of pending writes to complete
         */
        private void completeNext(int count) {
            for (int i = 0; i < count; i++) {
                pending.removeFirst().complete(true);
            }
        }

        /**
         * Completes the next started write exceptionally.
         */
        private void failNext() {
            pending.removeFirst().completeExceptionally(new IllegalStateException("notification write failed"));
        }
    }
}
