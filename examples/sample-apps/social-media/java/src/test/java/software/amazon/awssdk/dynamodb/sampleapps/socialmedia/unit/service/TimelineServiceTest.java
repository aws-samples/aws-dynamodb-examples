package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.unit.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.concurrent.CompletableFuture;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto.TimelineEntryResponse;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto.TimelinePageResponse;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.exception.ValidationException;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.mapper.TimelineMapper;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.MediaRef;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.TimelineEntry;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.TimelinePage;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.TimelineRepository;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.service.S3MediaGateway;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.service.TimelineService;

/**
 * Unit coverage for the operation 4 home-timeline read. No Docker or Spring context is
 * required. The repository and S3 gateway are mocked so limit normalization, direction pass-through, media
 * enrichment, and page assembly are exercised in isolation. The real mapper keeps the response shape
 * honest.
 */
@Tag("unit")
@ExtendWith(MockitoExtension.class)
class TimelineServiceTest {

    private static final String USER = "user_bob";
    private static final String BUCKET = "test-bucket";

    @Mock
    private TimelineRepository timelineRepository;

    @Mock
    private S3MediaGateway s3MediaGateway;

    private TimelineService service;

    @BeforeEach
    void setUp() {
        service = new TimelineService(timelineRepository, s3MediaGateway, new TimelineMapper());
    }

    @Test
    void readTimeline_withAbsentLimit_defaultsToFifty() {
        stubEmptyPage();

        service.readTimeline(USER, null, false, null).join();

        verify(timelineRepository).queryTimeline(eq(USER), eq(50), eq(false), any());
    }

    @Test
    void readTimeline_withLimitOne_passesThrough() {
        stubEmptyPage();

        service.readTimeline(USER, 1, false, null).join();

        verify(timelineRepository).queryTimeline(eq(USER), eq(1), eq(false), any());
    }

    @Test
    void readTimeline_withLimitFifty_passesThrough() {
        stubEmptyPage();

        service.readTimeline(USER, 50, false, null).join();

        verify(timelineRepository).queryTimeline(eq(USER), eq(50), eq(false), any());
    }

    @Test
    void readTimeline_withLimitOneHundred_passesThrough() {
        stubEmptyPage();

        service.readTimeline(USER, 100, false, null).join();

        verify(timelineRepository).queryTimeline(eq(USER), eq(100), eq(false), any());
    }

    @Test
    void readTimeline_withNonPositiveLimit_throwsValidationError() {
        assertThatThrownBy(() -> service.readTimeline(USER, 0, false, null))
                .isInstanceOf(ValidationException.class)
                .hasMessage("limit must be between 1 and 100");
        assertThatThrownBy(() -> service.readTimeline(USER, -1, false, null))
                .isInstanceOf(ValidationException.class)
                .hasMessage("limit must be between 1 and 100");
    }

    @Test
    void readTimeline_withLimitAboveMaximum_throwsValidationError() {
        assertThatThrownBy(() -> service.readTimeline(USER, 101, false, null))
                .isInstanceOf(ValidationException.class)
                .hasMessage("limit must be between 1 and 100");
    }

    @Test
    void readTimeline_withSuppliedLimitAboveFifty_passesThrough() {
        stubEmptyPage();

        service.readTimeline(USER, 51, false, null).join();

        verify(timelineRepository).queryTimeline(eq(USER), eq(51), eq(false), any());
    }

    @Test
    void inRangeLimitAndForwardDirectionPassThrough() {
        stubEmptyPage();

        service.readTimeline(USER, 10, true, null).join();

        verify(timelineRepository).queryTimeline(eq(USER), eq(10), eq(true), any());
    }

    @Test
    void emptyPageReturnsEmptyItemsAndNoToken() {
        stubEmptyPage();

        TimelinePageResponse response = service.readTimeline(USER, 20, false, null).join();

        assertThat(response.userId()).isEqualTo(USER);
        assertThat(response.items()).isEmpty();
        assertThat(response.nextToken()).isNull();
    }

    @Test
    void mapsEntriesAndEnrichesMediaWithPresignedUrl() {
        MediaRef ref = new MediaRef("media_1", "IMAGE", "image/jpeg",
                BUCKET, "media/user_alice/media_1", 42L, null, null, null);
        TimelineEntry withMedia = entry("post_1", "user_alice", "Hello followers",
                "2026-05-27T11:00:00Z", List.of(ref));
        TimelineEntry mediaOnly = entry("post_2", "user_alice", null,
                "2026-05-27T10:00:00Z", null);
        when(timelineRepository.queryTimeline(eq(USER), eq(20), eq(false), any()))
                .thenReturn(CompletableFuture.completedFuture(
                        new TimelinePage(List.of(withMedia, mediaOnly), "next-token")));
        when(s3MediaGateway.presignDownload(BUCKET, "media/user_alice/media_1"))
                .thenReturn("https://s3.example.com/media/user_alice/media_1?X-Amz-sig");

        TimelinePageResponse response = service.readTimeline(USER, 20, false, null).join();

        assertThat(response.nextToken()).isEqualTo("next-token");
        assertThat(response.items()).hasSize(2);

        TimelineEntryResponse first = response.items().get(0);
        assertThat(first.postId()).isEqualTo("post_1");
        assertThat(first.text()).isEqualTo("Hello followers");
        assertThat(first.media()).hasSize(1);
        assertThat(first.media().get(0).mediaId()).isEqualTo("media_1");
        assertThat(first.media().get(0).url()).contains("X-Amz-sig");

        TimelineEntryResponse second = response.items().get(1);
        assertThat(second.text()).isNull();
        assertThat(second.media()).isNull();
    }

    @Test
    void nextTokenPassesThroughToRepository() {
        when(timelineRepository.queryTimeline(eq(USER), eq(20), eq(false), eq("prev-token")))
                .thenReturn(CompletableFuture.completedFuture(new TimelinePage(List.of(), null)));

        service.readTimeline(USER, 20, false, "prev-token").join();

        verify(timelineRepository).queryTimeline(eq(USER), eq(20), eq(false), eq("prev-token"));
    }

    private void stubEmptyPage() {
        lenient().when(timelineRepository.queryTimeline(any(), any(Integer.class), any(Boolean.class), any()))
                .thenReturn(CompletableFuture.completedFuture(new TimelinePage(List.of(), null)));
    }

    private TimelineEntry entry(String postId, String authorId, String text, String createdAt,
                                List<MediaRef> media) {
        TimelineEntry entry = new TimelineEntry();
        entry.setPk(TimelineEntry.partitionKey(USER));
        entry.setSk(TimelineEntry.sortKey(createdAt, postId));
        entry.setTimelineUserId(USER);
        entry.setTimelineCreatedAt(createdAt);
        entry.setTimelinePostId(postId);
        entry.setPostId(postId);
        entry.setAuthorId(authorId);
        entry.setText(text);
        entry.setCreatedAt(createdAt);
        entry.setVisibility("PUBLIC");
        entry.setMedia(media);
        return entry;
    }
}
