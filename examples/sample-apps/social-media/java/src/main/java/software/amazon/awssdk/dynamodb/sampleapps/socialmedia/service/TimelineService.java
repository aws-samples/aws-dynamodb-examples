package software.amazon.awssdk.dynamodb.sampleapps.socialmedia.service;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletableFuture;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto.MediaResponse;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto.TimelineEntryResponse;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.dto.TimelinePageResponse;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.exception.ValidationException;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.mapper.TimelineMapper;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.MediaRef;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.model.TimelineEntry;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.TimelinePage;
import software.amazon.awssdk.dynamodb.sampleapps.socialmedia.repository.TimelineRepository;

/**
 * Reads a home timeline ordered by time.
 *
 * <p>Runs one {@code Query} on {@code GSI_TIMELINE} through the {@link TimelineRepository}, newest
 * first by default, then enriches each media reference with a time-limited presigned download URL and
 * builds the page response. Eligibility was fixed at publish-time fan-out, so this path never
 * re-evaluates visibility. The read is eventually consistent by definition for a GSI projection.
 *
 * <p>An omitted {@code limit} defaults to 50. A supplied {@code limit} must be 1 through 100 or the
 * read fails with {@link ValidationException}. The opaque {@code nextToken} is route-specific: a
 * token minted for another list route is rejected downstream when its discriminator is validated.
 * DynamoDB and S3 I/O stay async end-to-end.
 */
@Service
public class TimelineService {

    private static final Logger logger = LoggerFactory.getLogger(TimelineService.class);

static final int DEFAULT_LIMIT = 50;

static final int MIN_LIMIT = 1;

static final int MAX_LIMIT = 100;

private final TimelineRepository timelineRepository;
private final S3MediaGateway s3MediaGateway;
private final TimelineMapper timelineMapper;

    /**
     * @param timelineRepository Timelines persistence boundary
     * @param s3MediaGateway     presigned-URL gateway
     * @param timelineMapper     response mapping
     */
    public TimelineService(TimelineRepository timelineRepository,
                           S3MediaGateway s3MediaGateway,
                           TimelineMapper timelineMapper) {
        this.timelineRepository = timelineRepository;
        this.s3MediaGateway = s3MediaGateway;
        this.timelineMapper = timelineMapper;
    }

    /**
     * Reads one page of the given user's home timeline.
     *
     * @param userId           timeline owner from the path
     * @param limit            requested page size, or {@code null} for the default of 50. Accepted
     *                         values are 1 through 100
     * @param scanIndexForward {@code false} for newest-first (default), {@code true} for oldest-first
     * @param nextToken        opaque continuation from a prior page, or {@code null} for the first page
     * @return a future completing with the page response
     * @throws ValidationException when a supplied {@code limit} is outside 1 through 100
     */
    public CompletableFuture<TimelinePageResponse> readTimeline(String userId,
                                                                Integer limit,
                                                                boolean scanIndexForward,
                                                                String nextToken) {
        int effectiveLimit = normalizeLimit(limit);
        logger.debug("Reading timeline [userId={}, limit={}, scanIndexForward={}, paged={}]",
                userId, effectiveLimit, scanIndexForward, nextToken != null);

        return timelineRepository.queryTimeline(userId, effectiveLimit, scanIndexForward, nextToken)
                .thenApply(page -> buildResponse(userId, page));
    }

    /** Builds the page response, enriching each entry's media with presigned download URLs. */
    private TimelinePageResponse buildResponse(String userId, TimelinePage page) {
        List<TimelineEntryResponse> items = new ArrayList<>();
        for (TimelineEntry entry : page.items()) {
            items.add(toEntryResponse(entry));
        }
        return timelineMapper.toPageResponse(userId, items, page.nextToken());
    }

    /** Maps one timeline entry, presigning a download URL per media attachment. */
    private TimelineEntryResponse toEntryResponse(TimelineEntry entry) {
        List<MediaResponse> media = null;
        if (entry.getMedia() != null && !entry.getMedia().isEmpty()) {
            media = new ArrayList<>();
            for (MediaRef ref : entry.getMedia()) {
                String url = s3MediaGateway.presignDownload(ref.s3Bucket(), ref.s3Key());
                media.add(timelineMapper.toMediaResponse(ref, url));
            }
        }
        return timelineMapper.toEntryResponse(entry, media);
    }

    /**
     * Defaults an omitted page size and validates that a supplied page size is 1 through 100.
     *
     * @param limit the requested page size, or {@code null}
     * @return the supplied or default page size
     * @throws ValidationException when a supplied page size is outside 1 through 100
     */
    private int normalizeLimit(Integer limit) {
        if (limit == null) {
            return DEFAULT_LIMIT;
        }
        if (limit < MIN_LIMIT || limit > MAX_LIMIT) {
            throw new ValidationException("limit must be between 1 and 100");
        }
        return limit;
    }
}
