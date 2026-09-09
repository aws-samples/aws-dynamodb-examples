package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.integration.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.utility.DockerImageName;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.ConversationMeta;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.ConversationParticipant;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.FollowerEdge;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.FollowingEdge;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.InboxEntry;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.Like;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.Message;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.Notification;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.PostMeta;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.TimelineEntry;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.UserPost;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.UserProfile;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.ContentRepository;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.ConversationRepository;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.ConversationSnapshot;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.FollowerQueryResult;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.InboxPage;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.MessageRepository;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.NotificationRepository;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.TimelinePage;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.TimelineRepository;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.UserGraphRepository;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.util.DynamoDbSchema;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.util.InboxGsiProjectionAttributes;
import software.amazon.awssdk.services.dynamodb.DynamoDbAsyncClient;
import software.amazon.awssdk.services.dynamodb.model.DescribeTableRequest;
import software.amazon.awssdk.services.dynamodb.model.GlobalSecondaryIndexDescription;
import software.amazon.awssdk.services.dynamodb.model.KeyType;
import software.amazon.awssdk.services.dynamodb.model.ProjectionType;

/**
 * Minimal repository-boundary CRUD integration tests against DynamoDB Local.
 *
 * <p>Each test proves the primary create/read path of one domain repository through the interface,
 * so the same scenarios run for every {@code dynamodb.client-type} via the concrete subclasses. A
 * single DynamoDB Local container is shared across both client types (singleton pattern). Tables are
 * created and seeded by the application's own startup initializer ({@code create-resources=true}) and
 * the streams poller is disabled so it does not race these HTTP-free tests.
 *
 * <p>Every entity uses a freshly generated id so the two client-type runs never collide in the
 * shared container.
 */
abstract class AbstractRepositoryCrudIntegrationTest {

private static final int DYNAMODB_PORT = 8000;

private static final long AWAIT_SECONDS = 20;

private static final String TS = "2026-05-27T11:00:00Z";

static final GenericContainer<?> DYNAMODB =
            new GenericContainer<>(DockerImageName.parse("amazon/dynamodb-local:latest"))
                    .withExposedPorts(DYNAMODB_PORT);

    static {
        DYNAMODB.start();
    }

    @Autowired
    protected UserGraphRepository userGraphRepository;

    @Autowired
    protected ContentRepository contentRepository;

    @Autowired
    protected TimelineRepository timelineRepository;

    @Autowired
    protected ConversationRepository conversationRepository;

    @Autowired
    protected MessageRepository messageRepository;

    @Autowired
    protected NotificationRepository notificationRepository;

    @Autowired
    private DynamoDbAsyncClient dynamoDbAsyncClient;

    /**
     * Points the application at the shared DynamoDB Local container, enables resource creation, and
     * disables the streams poller for these tests.
     *
     * @param registry dynamic property registry
     */
    @DynamicPropertySource
    static void configure(DynamicPropertyRegistry registry) {
        registry.add("dynamodb.endpoint",
                () -> "http://" + DYNAMODB.getHost() + ":" + DYNAMODB.getMappedPort(DYNAMODB_PORT));
        registry.add("dynamodb.create-resources", () -> "true");
        registry.add("dynamodb.streams.enabled", () -> "false");
    }

    @Test
    void tableInitializationCreatesOrderedMultiKeyGlobalSecondaryIndexes() {
        GlobalSecondaryIndexDescription timelineIndex = globalSecondaryIndex("JavaTimelines", DynamoDbSchema.GSI_TIMELINE);
        assertThat(timelineIndex.keySchema())
                .extracting(key -> key.attributeName() + ":" + key.keyType())
                .containsExactly(
                        DynamoDbSchema.TIMELINE_USER_ID + ":" + KeyType.HASH,
                        DynamoDbSchema.TIMELINE_CREATED_AT + ":" + KeyType.RANGE,
                        DynamoDbSchema.TIMELINE_POST_ID + ":" + KeyType.RANGE);
        assertThat(timelineIndex.projection().projectionType()).isEqualTo(ProjectionType.ALL);

        GlobalSecondaryIndexDescription inboxIndex = globalSecondaryIndex("JavaConversations", DynamoDbSchema.GSI_INBOX);
        assertThat(inboxIndex.keySchema())
                .extracting(key -> key.attributeName() + ":" + key.keyType())
                .containsExactly(
                        DynamoDbSchema.INBOX_USER_ID + ":" + KeyType.HASH,
                        DynamoDbSchema.CONVERSATION_TYPE + ":" + KeyType.RANGE,
                        DynamoDbSchema.LAST_ACTIVITY_AT + ":" + KeyType.RANGE);
        assertThat(inboxIndex.projection().projectionType()).isEqualTo(ProjectionType.INCLUDE);
        assertThat(inboxIndex.projection().nonKeyAttributes())
                .containsExactlyInAnyOrderElementsOf(InboxGsiProjectionAttributes.GSI_INBOX_PROJECTED_NON_KEYS);
    }

    /** Loads one named global secondary index from an application-created table. */
    private GlobalSecondaryIndexDescription globalSecondaryIndex(String tableName, String indexName) {
        return dynamoDbAsyncClient.describeTable(DescribeTableRequest.builder().tableName(tableName).build())
                .join()
                .table()
                .globalSecondaryIndexes()
                .stream()
                .filter(index -> indexName.equals(index.indexName()))
                .findFirst()
                .orElseThrow();
    }

    @Test
    void userGraphRepositoryCreateReadAndFollow() {
        String alice = "user_" + unique();
        String bob = "user_" + unique();
        await(userGraphRepository.putProfileIfAbsent(profile(alice, "Alice")));
        await(userGraphRepository.putProfileIfAbsent(profile(bob, "Bob")));

        UserProfile stored = await(userGraphRepository.getProfile(alice));
        assertThat(stored).isNotNull();
        assertThat(stored.getDisplayName()).isEqualTo("Alice");

        // Re-create under a different owner (same PK) must fail the attribute_not_exists(PK) guard.
        assertThrowsCause(() -> await(userGraphRepository.putProfileIfAbsent(profile(alice, "Impostor"))),
                "ConditionalCheckFailed");

        await(userGraphRepository.followTransaction(following(alice, bob), follower(alice, bob)));
        assertThat(await(userGraphRepository.getFollowingEdge(alice, bob))).isNotNull();
        FollowerQueryResult followers = await(userGraphRepository.queryFollowers(bob));
        assertThat(followers.complete()).isTrue();
        assertThat(followers.followers()).extracting(FollowerEdge::getFollowerId).containsExactly(alice);
    }

    @Test
    void contentRepositoryPublishAndLike() {
        String author = "user_" + unique();
        String liker = "user_" + unique();
        String postId = "post_" + unique();
        await(contentRepository.putPost(postMeta(postId, author), userPost(postId, author)));

        PostMeta meta = await(contentRepository.getPostMeta(postId));
        assertThat(meta).isNotNull();
        assertThat(meta.getLikeCount()).isEqualTo(0L);
        assertThat(await(contentRepository.getLike(postId, liker))).isNull();

        await(contentRepository.likeTransaction(like(postId, liker)));
        assertThat(await(contentRepository.getLike(postId, liker))).isNotNull();
        assertThat(await(contentRepository.getPostMeta(postId)).getLikeCount()).isEqualTo(1L);

        // A duplicate like cancels the transaction and does not double-increment the counter.
        assertThrowsCause(() -> await(contentRepository.likeTransaction(like(postId, liker))),
                "TransactionCanceled");
        assertThat(await(contentRepository.getPostMeta(postId)).getLikeCount()).isEqualTo(1L);
    }

    @Test
    void timelineRepositoryFanOutAndRead() {
        String recipient = "user_" + unique();
        String author = "user_" + unique();
        String olderPost = "post_" + unique();
        String newerPost = "post_" + unique();
        await(timelineRepository.fanOut(List.of(
                timelineEntry(recipient, author, olderPost, "2026-05-27T10:00:00Z"),
                timelineEntry(recipient, author, newerPost, "2026-05-27T12:00:00Z")), 25));

        TimelinePage page = await(timelineRepository.queryTimeline(recipient, 20, false, null));
        assertThat(page.items()).hasSize(2);
        assertThat(page.items()).extracting(TimelineEntry::getTimelineUserId).containsOnly(recipient);
    }

    @Test
    void conversationRepositoryCreateFanOutAndRead() {
        String conversationId = "conv_" + unique();
        String a = "user_" + unique();
        String b = "user_" + unique();
        String c = "user_" + unique();
        await(conversationRepository.createConversation(
                groupMeta(conversationId, 3),
                List.of(participant(conversationId, a), participant(conversationId, b), participant(conversationId, c))));

        assertThat(await(conversationRepository.getConversationMeta(conversationId))).isNotNull();
        assertThat(await(conversationRepository.getParticipant(conversationId, a))).isNotNull();
        ConversationSnapshot snapshot = await(conversationRepository.getSnapshot(conversationId));
        assertThat(snapshot.meta()).isNotNull();
        assertThat(snapshot.participants()).hasSize(3);
        List<ConversationParticipant> queried = await(conversationRepository.queryParticipants(conversationId));
        assertThat(queried).extracting(ConversationParticipant::getUserId)
                .containsExactlyInAnyOrder(a, b, c);

        await(conversationRepository.fanOutInbox(List.of(
                inboxEntry(a, conversationId, "GROUP", "2026-05-27T13:00:00Z"),
                inboxEntry(b, conversationId, "GROUP", "2026-05-27T13:00:00Z")), 25));
        InboxPage filtered = await(conversationRepository.queryInbox(a, "GROUP", 20, false, null));
        assertThat(filtered.items()).extracting(InboxEntry::getConversationId).contains(conversationId);
        InboxPage merged = await(conversationRepository.queryInbox(a, null, 20, false, null));
        assertThat(merged.items()).extracting(InboxEntry::getConversationId).contains(conversationId);
    }

    @Test
    void conversationRepositoryQueryParticipants_whenOneHundredOneMembers_drainsEveryPage() {
        String conversationId = "conv_" + unique();
        List<String> members = memberIds(101);
        await(conversationRepository.createConversation(
                groupMeta(conversationId, members.size()),
                participants(conversationId, members)));

        List<ConversationParticipant> queried = await(conversationRepository.queryParticipants(conversationId));
        assertThat(queried).extracting(ConversationParticipant::getUserId)
                .containsExactlyInAnyOrderElementsOf(members);
    }

    @Test
    void conversationRepositoryQueryParticipants_whenUnknownConversation_returnsEmpty() {
        assertThat(await(conversationRepository.queryParticipants("conv_" + unique()))).isEmpty();
    }

    @Test
    void messageRepositoryAppendAndRead() {
        String conversationId = "conv_" + unique();
        String messageId = "msg_" + unique();
        await(messageRepository.putMessage(message(conversationId, messageId, "user_" + unique())));

        List<Message> messages = await(messageRepository.queryMessages(conversationId));
        assertThat(messages).extracting(Message::getMessageId).containsExactly(messageId);
    }

    @Test
    void notificationRepositoryIdempotentWriteAndRead() {
        String recipient = "user_" + unique();
        String notificationId = "ntf_" + unique();
        Notification notification = notification(recipient, notificationId);

        assertThat(await(notificationRepository.putNotificationIfAbsent(notification))).isTrue();
        // Duplicate delivery of the same notification key is a no-op.
        assertThat(await(notificationRepository.putNotificationIfAbsent(notification))).isFalse();

        List<Notification> stored = await(notificationRepository.queryNotifications(recipient));
        assertThat(stored).extracting(Notification::getNotificationId).containsExactly(notificationId);
    }

    /** Blocks on a repository future with a bounded timeout. */
    private static <T> T await(CompletableFuture<T> future) {
        try {
            return future.get(AWAIT_SECONDS, TimeUnit.SECONDS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Interrupted awaiting repository future", e);
        } catch (ExecutionException e) {
            throw new CompletionException(e.getCause());
        } catch (TimeoutException e) {
            throw new IllegalStateException("Repository future did not complete in time", e);
        }
    }

    /** Asserts the thrown exception's cause chain contains a type whose name contains {@code marker}. */
    private static void assertThrowsCause(Runnable action, String marker) {
        RuntimeException thrown = assertThrows(RuntimeException.class, action::run);
        Throwable current = thrown;
        while (current != null) {
            if (current.getClass().getSimpleName().contains(marker)) {
                return;
            }
            current = current.getCause();
        }
        throw new AssertionError("Expected a cause containing '" + marker + "' but got: " + thrown, thrown);
    }

    /** Returns a short unique suffix for test entity ids. */
    private static String unique() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 12);
    }

    private static UserProfile profile(String userId, String displayName) {
        UserProfile profile = new UserProfile();
        profile.setPk(UserProfile.partitionKey(userId));
        profile.setSk(UserProfile.SORT_KEY);
        profile.setEntityType(UserProfile.ENTITY_TYPE);
        profile.setUserId(userId);
        profile.setDisplayName(displayName);
        profile.setCreatedAt(TS);
        return profile;
    }

    private static FollowingEdge following(String followerId, String followeeId) {
        FollowingEdge edge = new FollowingEdge();
        edge.setPk(FollowingEdge.PK_PREFIX + followerId);
        edge.setSk(FollowingEdge.sortKey(followeeId));
        edge.setEntityType(FollowingEdge.ENTITY_TYPE);
        edge.setFollowerId(followerId);
        edge.setFolloweeId(followeeId);
        edge.setCreatedAt(TS);
        return edge;
    }

    private static FollowerEdge follower(String followerId, String followeeId) {
        FollowerEdge edge = new FollowerEdge();
        edge.setPk(FollowerEdge.PK_PREFIX + followeeId);
        edge.setSk(FollowerEdge.sortKey(followerId));
        edge.setEntityType(FollowerEdge.ENTITY_TYPE);
        edge.setFollowerId(followerId);
        edge.setFolloweeId(followeeId);
        edge.setCreatedAt(TS);
        return edge;
    }

    private static PostMeta postMeta(String postId, String authorId) {
        PostMeta meta = new PostMeta();
        meta.setPk(PostMeta.partitionKey(postId));
        meta.setSk(PostMeta.SORT_KEY);
        meta.setEntityType(PostMeta.ENTITY_TYPE);
        meta.setPostId(postId);
        meta.setAuthorId(authorId);
        meta.setType("POST");
        meta.setVisibility("PUBLIC");
        meta.setText("Hello followers");
        meta.setCreatedAt(TS);
        meta.setLikeCount(0L);
        return meta;
    }

    private static UserPost userPost(String postId, String authorId) {
        UserPost post = new UserPost();
        post.setPk(UserPost.PK_PREFIX + authorId);
        post.setSk(UserPost.sortKey(TS, postId));
        post.setEntityType(UserPost.ENTITY_TYPE);
        post.setPostId(postId);
        post.setAuthorId(authorId);
        post.setType("POST");
        post.setVisibility("PUBLIC");
        post.setText("Hello followers");
        post.setCreatedAt(TS);
        return post;
    }

    private static Like like(String postId, String userId) {
        Like like = new Like();
        like.setPk(Like.PK_PREFIX + postId);
        like.setSk(Like.sortKey(userId));
        like.setEntityType(Like.ENTITY_TYPE);
        like.setPostId(postId);
        like.setUserId(userId);
        like.setCreatedAt(TS);
        return like;
    }

    private static TimelineEntry timelineEntry(String recipient, String authorId, String postId, String createdAt) {
        TimelineEntry entry = new TimelineEntry();
        entry.setPk(TimelineEntry.partitionKey(recipient));
        entry.setSk(TimelineEntry.sortKey(createdAt, postId));
        entry.setEntityType(TimelineEntry.ENTITY_TYPE);
        entry.setTimelineUserId(recipient);
        entry.setTimelineCreatedAt(createdAt);
        entry.setTimelinePostId(postId);
        entry.setPostId(postId);
        entry.setAuthorId(authorId);
        entry.setText("Hello followers");
        entry.setCreatedAt(createdAt);
        entry.setVisibility("PUBLIC");
        return entry;
    }

    private static ConversationMeta groupMeta(String conversationId, long participantCount) {
        ConversationMeta meta = new ConversationMeta();
        meta.setPk(ConversationMeta.partitionKey(conversationId));
        meta.setSk(ConversationMeta.SORT_KEY);
        meta.setEntityType(ConversationMeta.ENTITY_TYPE);
        meta.setConversationId(conversationId);
        meta.setType("GROUP");
        meta.setTitle("Weekend hike");
        meta.setParticipantCount(participantCount);
        meta.setCreatedAt(TS);
        return meta;
    }

    /**
     * Builds one conversation member row for repository writes and reads.
     *
     * @param conversationId conversation partition
     * @param userId         member id
     * @return participant row
     */
    private static ConversationParticipant participant(String conversationId, String userId) {
        ConversationParticipant participant = new ConversationParticipant();
        participant.setPk(ConversationParticipant.PK_PREFIX + conversationId);
        participant.setSk(ConversationParticipant.sortKey(userId));
        participant.setEntityType(ConversationParticipant.ENTITY_TYPE);
        participant.setUserId(userId);
        participant.setJoinedAt(TS);
        return participant;
    }

    /**
     * Builds participant rows for every supplied user id.
     *
     * @param conversationId conversation partition
     * @param userIds        member ids
     * @return participant rows in the supplied order
     */
    private static List<ConversationParticipant> participants(String conversationId, List<String> userIds) {
        List<ConversationParticipant> rows = new ArrayList<>();
        for (String userId : userIds) {
            rows.add(participant(conversationId, userId));
        }
        return rows;
    }

    /**
     * Returns deterministic participant ids for the requested group size.
     *
     * @param count number of members
     * @return member ids
     */
    private static List<String> memberIds(int count) {
        List<String> members = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            members.add(String.format("user_%03d_%s", i, unique()));
        }
        return members;
    }

    private static InboxEntry inboxEntry(String userId, String conversationId, String type, String lastActivityAt) {
        InboxEntry entry = new InboxEntry();
        entry.setPk(InboxEntry.partitionKey(userId));
        entry.setSk(InboxEntry.sortKey(conversationId));
        entry.setEntityType(InboxEntry.ENTITY_TYPE);
        entry.setInboxUserId(userId);
        entry.setConversationType(type);
        entry.setLastActivityAt(lastActivityAt);
        entry.setConversationId(conversationId);
        entry.setTitle("Weekend hike");
        entry.setLastMessagePreview("See you at 3");
        return entry;
    }

    private static Message message(String conversationId, String messageId, String senderId) {
        Message message = new Message();
        message.setPk(Message.partitionKey(conversationId));
        message.setSk(Message.sortKey(TS, messageId));
        message.setEntityType(Message.ENTITY_TYPE);
        message.setMessageId(messageId);
        message.setConversationId(conversationId);
        message.setSenderId(senderId);
        message.setText("Are you free?");
        message.setCreatedAt(TS);
        return message;
    }

    private static Notification notification(String recipientUserId, String notificationId) {
        Notification notification = new Notification();
        notification.setPk(Notification.partitionKey(recipientUserId));
        notification.setSk(Notification.sortKey(TS, notificationId));
        notification.setEntityType(Notification.ENTITY_TYPE);
        notification.setNotificationId(notificationId);
        notification.setRecipientUserId(recipientUserId);
        notification.setSourceType("POST");
        notification.setSourceId("post_" + unique());
        notification.setCreatedAt(TS);
        return notification;
    }
}
