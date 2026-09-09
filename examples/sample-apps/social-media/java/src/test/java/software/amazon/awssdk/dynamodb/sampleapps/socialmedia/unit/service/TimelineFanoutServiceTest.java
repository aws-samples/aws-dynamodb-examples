package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.unit.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.concurrent.CompletableFuture;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.mapper.PostMapper;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.FollowerEdge;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.PostMeta;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.TimelineEntry;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.FollowerQueryResult;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.TimelineRepository;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.UserGraphRepository;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.service.TimelineFanoutService;

/**
 * Unit coverage for visibility-scoped timeline fan-out and the follower-enumeration cap.
 *
 * <p>Repositories are mocked so below-cap, at-cap, and cap-plus-one {@code PUBLIC} results, plus
 * {@code RESTRICTED} and {@code PRIVATE} paths that must not query followers, can be asserted without
 * Docker.
 */
@Tag("unit")
@ExtendWith(MockitoExtension.class)
class TimelineFanoutServiceTest {

    private static final String CREATED_AT = "2026-05-27T10:00:00Z";

    @Mock
    private UserGraphRepository userGraphRepository;

    @Mock
    private TimelineRepository timelineRepository;

    private TimelineFanoutService service;

    /**
     * Wires the real mapper with mocked persistence.
     */
    @BeforeEach
    void setUp() {
        service = new TimelineFanoutService(userGraphRepository, timelineRepository, new PostMapper(), 25);
    }

    @Test
    void fanOut_whenPublicBelowCap_writesEveryFollower() {
        stubFanOut();
        when(userGraphRepository.queryFollowers("user_author"))
                .thenReturn(CompletableFuture.completedFuture(
                        new FollowerQueryResult(List.of(edge("user_a")), true, 2)));

        service.fanOut(publicPost()).join();

        assertThat(capturedRecipients()).containsExactly("user_a");
    }

    @Test
    void fanOut_whenPublicAtCap_writesEveryFollower() {
        stubFanOut();
        when(userGraphRepository.queryFollowers("user_author"))
                .thenReturn(CompletableFuture.completedFuture(
                        new FollowerQueryResult(List.of(edge("user_a"), edge("user_b")), true, 2)));

        service.fanOut(publicPost()).join();

        assertThat(capturedRecipients()).containsExactly("user_a", "user_b");
    }

    @Test
    void fanOut_whenPublicCapPlusOne_writesOnlyReturnedFollowers() {
        stubFanOut();
        when(userGraphRepository.queryFollowers("user_author"))
                .thenReturn(CompletableFuture.completedFuture(
                        new FollowerQueryResult(List.of(edge("user_a"), edge("user_b")), false, 2)));

        service.fanOut(publicPost()).join();

        assertThat(capturedRecipients()).containsExactly("user_a", "user_b");
    }

    @Test
    void fanOut_whenRestricted_doesNotQueryFollowers() {
        stubFanOut();
        PostMeta meta = post("RESTRICTED", "POST");
        meta.setAllowedViewerUserIds(List.of("user_a", "user_b", "user_c"));

        service.fanOut(meta).join();

        verify(userGraphRepository, never()).queryFollowers(anyString());
        assertThat(capturedRecipients()).containsExactly("user_a", "user_b", "user_c");
    }

    @Test
    void fanOut_whenPrivate_doesNotQueryFollowers() {
        service.fanOut(post("PRIVATE", "POST")).join();

        verify(userGraphRepository, never()).queryFollowers(anyString());
        verify(timelineRepository, never()).fanOut(any(), anyInt());
    }

    @Test
    void fanOut_whenStory_doesNotQueryFollowers() {
        service.fanOut(post("PUBLIC", "STORY")).join();

        verify(userGraphRepository, never()).queryFollowers(anyString());
        verify(timelineRepository, never()).fanOut(any(), anyInt());
    }

    /**
     * Stubs a successful timeline batch write.
     */
    private void stubFanOut() {
        when(timelineRepository.fanOut(any(), anyInt())).thenReturn(CompletableFuture.completedFuture(null));
    }

    /**
     * Captures recipient user ids from the timeline batch.
     *
     * @return recipient ids in write order
     */
    @SuppressWarnings("unchecked")
    private List<String> capturedRecipients() {
        ArgumentCaptor<List<TimelineEntry>> captor = ArgumentCaptor.forClass(List.class);
        verify(timelineRepository).fanOut(captor.capture(), eq(25));
        return captor.getValue().stream().map(TimelineEntry::getTimelineUserId).toList();
    }

    /**
     * Builds a {@code PUBLIC} post used by the follower-cap scenarios.
     *
     * @return post metadata
     */
    private static PostMeta publicPost() {
        return post("PUBLIC", "POST");
    }

    /**
     * Builds post metadata for a fan-out call.
     *
     * @param visibility {@code PUBLIC}, {@code RESTRICTED}, or {@code PRIVATE}
     * @param type       {@code POST} or {@code STORY}
     * @return post metadata
     */
    private static PostMeta post(String visibility, String type) {
        PostMeta meta = new PostMeta();
        meta.setPostId("post_1");
        meta.setAuthorId("user_author");
        meta.setType(type);
        meta.setVisibility(visibility);
        meta.setText("Hello followers");
        meta.setCreatedAt(CREATED_AT);
        return meta;
    }

    /**
     * Builds a follower edge that carries only the follower id used in recipient assertions.
     *
     * @param followerId follower user id
     * @return edge with {@code followerId} set
     */
    private static FollowerEdge edge(String followerId) {
        FollowerEdge edge = new FollowerEdge();
        edge.setFollowerId(followerId);
        return edge;
    }
}
