package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.service;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletableFuture;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.mapper.PostMapper;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.FollowerEdge;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.PostMeta;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.PostType;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.TimelineEntry;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.Visibility;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.TimelineRepository;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.UserGraphRepository;

/**
 * Materializes the visibility-scoped home-timeline fan-out for a published post.
 *
 * <p>This is the single fan-out implementation shared by both timing modes. In {@code SYNC} mode
 * {@link PostService} drives {@link #fanOut(PostMeta)} before the publish response. In {@code ASYNC}
 * mode {@link NotificationProjectionService} drives the same method from the {@code POST_META}
 * insert. Because both call {@link #fanOut(PostMeta)} with the same source row, {@code SYNC} and
 * {@code ASYNC} produce identical timeline rows and identical reads (eventually consistent).
 *
 * <p>Recipient rules follow the visibility matrix. {@code PUBLIC} fans out to followers resolved by
 * {@link UserGraphRepository#queryFollowers(String)} up to {@code dynamodb.follower-fanout-cap}.
 * {@code RESTRICTED} fans out to the explicit allow list. {@code PRIVATE} fans out to nobody. A
 * {@link PostType#STORY} is never copied to follower timelines. Fan-out reaches every resolved
 * recipient through {@link TimelineRepository#fanOut(List, int)}, which chunks {@code BatchWriteItem}
 * and drains {@code UnprocessedItems}. DynamoDB I/O stays async end-to-end.
 */
@Service
public class TimelineFanoutService {

    private static final Logger logger = LoggerFactory.getLogger(TimelineFanoutService.class);

    private final UserGraphRepository userGraphRepository;
    private final TimelineRepository timelineRepository;
    private final PostMapper postMapper;
    private final int timelineFanoutMax;

    /**
     * Creates the shared fan-out service.
     *
     * @param userGraphRepository UserGraph persistence boundary
     * @param timelineRepository  Timelines persistence boundary
     * @param postMapper          timeline-entry mapping
     * @param timelineFanoutMax   max writes per timeline batch
     */
    public TimelineFanoutService(UserGraphRepository userGraphRepository,
                                 TimelineRepository timelineRepository,
                                 PostMapper postMapper,
                                 @Value("${dynamodb.timeline-fanout-max:25}") int timelineFanoutMax) {
        this.userGraphRepository = userGraphRepository;
        this.timelineRepository = timelineRepository;
        this.postMapper = postMapper;
        this.timelineFanoutMax = timelineFanoutMax;
    }

    /**
     * Fans out the given post to its eligible home timelines.
     *
     * <p>A {@link PostType#STORY} and a {@code PRIVATE} post write nothing. A {@code RESTRICTED} post
     * fans out to its allow list. A {@code PUBLIC} post resolves followers with
     * {@link UserGraphRepository#queryFollowers(String)} first.
     *
     * @param meta the source {@code POST_META} row
     * @return a future completing when every eligible recipient has a timeline copy
     */
    public CompletableFuture<Void> fanOut(PostMeta meta) {
        if (PostType.STORY.name().equals(meta.getType())) {
            return CompletableFuture.completedFuture(null);
        }
        Visibility visibility = Visibility.valueOf(meta.getVisibility());
        return switch (visibility) {
            case PRIVATE -> CompletableFuture.completedFuture(null);
            case RESTRICTED -> writeTimeline(meta, meta.getAllowedViewerUserIds());
            case PUBLIC -> userGraphRepository.queryFollowers(meta.getAuthorId())
                    .thenCompose(result -> {
                        result.warnIfTruncated(logger, meta.getAuthorId());
                        return writeTimeline(meta, result.followers().stream()
                                .map(FollowerEdge::getFollowerId)
                                .toList());
                    });
        };
    }

    /** Builds one timeline entry per recipient and fans them out in chunks, draining unprocessed items. */
    private CompletableFuture<Void> writeTimeline(PostMeta meta, List<String> recipients) {
        if (recipients == null || recipients.isEmpty()) {
            return CompletableFuture.completedFuture(null);
        }
        List<TimelineEntry> entries = new ArrayList<>();
        for (String recipient : recipients) {
            entries.add(postMapper.toTimelineEntry(recipient, meta));
        }
        logger.debug("Fanning out timeline [postId={}, recipients={}]", meta.getPostId(), entries.size());
        return timelineRepository.fanOut(entries, timelineFanoutMax);
    }
}
